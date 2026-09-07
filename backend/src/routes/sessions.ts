import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStats } from "../middleware/auth.js";

export const sessionsRouter = Router();
sessionsRouter.use(requireAuth("staff", "tutor"));

const JOURS_SEMAINE_NOMS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function serializeSession(s: any) {
  return {
    id: s.id,
    date: s.date.toISOString().slice(0, 10),
    jour: JOURS_SEMAINE_NOMS[s.date.getUTCDay()],
    horaire: s.scheduleSlot?.label ?? "",
    base: s.base.name,
    niveau: s.niveau.name,
    serie: s.serie?.name ?? "",
    groupe: s.groupLabel ?? "",
    matieres: s.matieres.map((m: any) => m.matiere.name),
    type: s.type,
    idEncadreur: s.tutor.displayId,
    nomEncadreur: `${s.tutor.lastName} ${s.tutor.firstName}`,
    statut: s.status,
  };
}

const sessionInclude = {
  base: true,
  niveau: true,
  serie: true,
  tutor: true,
  matieres: { include: { matiere: true } },
  scheduleSlot: true,
} as const;

// ---- Créer une séance (équivalent creerSeance) ----
const createSessionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horaire: z.string().min(1),
  baseId: z.string(),
  niveauId: z.string(),
  serieId: z.string().optional().nullable(),
  groupLabel: z.string().optional().nullable(),
  matiereIds: z.array(z.string()).min(1),
  tutorId: z.string(),
  type: z.enum(["NORMALE", "CONGES", "PREPA_BAC"]).default("NORMALE"),
});

sessionsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = createSessionSchema.parse(req.body);

    const tutor = await prisma.tutor.findUnique({ where: { id: data.tutorId }, include: { bases: true } });
    if (!tutor) throw new AppError("Encadreur introuvable.");

    const estStaffAutorise = session.kind === "staff" && session.canSeeStats;
    const estEncadreurPourSoiMeme = session.kind === "tutor" && session.sub === tutor.id;
    if (!estStaffAutorise && !estEncadreurPourSoiMeme) throw new ForbiddenError("Tu ne peux créer une séance que pour toi-même.");

    if (data.date > todayStr()) throw new AppError("Impossible de déclarer une séance pour un jour qui n'est pas encore arrivé.");

    const [base, niveau] = await Promise.all([
      prisma.base.findUnique({ where: { id: data.baseId } }),
      prisma.niveau.findUnique({ where: { id: data.niveauId } }),
    ]);
    if (!base) throw new AppError("Base invalide.");
    if (!niveau) throw new AppError("Niveau invalide.");

    const serie = niveau.hasSeries && data.serieId ? await prisma.serie.findUnique({ where: { id: data.serieId } }) : null;
    if (niveau.hasSeries && !serie) throw new AppError("Série invalide pour ce niveau.");

    const estRegimeSpecial = data.type === "CONGES" || data.type === "PREPA_BAC";
    // Toujours en UTC (date "calendaire" sans heure ni fuseau) — évite un décalage de jour de semaine
    // entre l'écriture ici et la lecture dans serializeSession() si le serveur ne tourne pas en UTC.
    const dateObj = new Date(`${data.date}T00:00:00Z`);
    let scheduleSlot = null;

    if (estRegimeSpecial) {
      if (!["Matin", "Soir"].includes(data.horaire)) throw new AppError("Horaire invalide (Matin ou Soir).");
    } else {
      scheduleSlot = await prisma.scheduleSlot.findFirst({ where: { dayOfWeek: dateObj.getUTCDay(), label: data.horaire } });
      if (!scheduleSlot) {
        throw new AppError("Ce jour n'a pas cours en période normale (seuls Mercredi, Samedi et Dimanche) — sauf en Congés ou Prépa BAC.");
      }
      if (!scheduleSlot.appliesToAllNiveaux && !niveau.isExamClass) {
        throw new AppError(`Ce créneau est réservé aux classes d'examen.`);
      }
    }

    // Groupe requis uniquement si des SessionGroup existent pour cette combinaison (remplace
    // _estCasGroupeTleDZaher() : plus de cas nommé, juste une table de config vide ou non).
    const groupesPossibles = await prisma.sessionGroup.findMany({ where: { baseId: base.id, niveauId: niveau.id, serieId: serie?.id ?? null } });
    let groupLabel: string | null = null;
    if (groupesPossibles.length > 0) {
      if (!data.groupLabel || !groupesPossibles.some((g) => g.label === data.groupLabel)) {
        throw new AppError(`Merci de choisir un groupe (${groupesPossibles.map((g) => g.label).join(", ")}).`);
      }
      groupLabel = data.groupLabel;
    }

    const matieres = await prisma.matiere.findMany({ where: { id: { in: data.matiereIds } } });
    if (matieres.length !== data.matiereIds.length) throw new AppError("Matière(s) invalide(s).");

    if (tutor.status !== "ACTIF") throw new AppError("Cet encadreur est inactif.");
    if (!tutor.bases.some((b) => b.baseId === base.id)) throw new AppError("Cet encadreur n'intervient pas sur cette base.");

    // Anti-doublon : une séance existe déjà pour ce créneau exact.
    const doublon = await prisma.session.findFirst({
      where: {
        date: dateObj,
        baseId: base.id,
        niveauId: niveau.id,
        serieId: serie?.id ?? null,
        groupLabel,
        status: { not: "ANNULEE" },
        scheduleSlotId: scheduleSlot?.id ?? null,
      },
      include: { tutor: true },
    });
    if (doublon) {
      const contact = doublon.tutor.phone ? ` — ${doublon.tutor.phone}` : "";
      throw new AppError(`Une séance existe déjà pour cette classe à ce créneau (${doublon.tutor.lastName} ${doublon.tutor.firstName}${contact}).`);
    }

    const created = await prisma.session.create({
      data: {
        date: dateObj,
        scheduleSlotId: scheduleSlot?.id ?? null,
        baseId: base.id,
        niveauId: niveau.id,
        serieId: serie?.id ?? null,
        groupLabel,
        type: data.type,
        tutorId: tutor.id,
        status: "FAITE",
        createdByUserId: session.kind === "staff" ? session.sub : null,
        matieres: { create: matieres.map((m) => ({ matiereId: m.id })) },
      },
    });

    res.status(201).json({ id: created.id });
  })
);

// ---- Liste des séances (équivalent getListeSeances) — staff avec accès stats ----
sessionsRouter.get(
  "/",
  requireAuth("staff"),
  requireStats,
  asyncHandler(async (_req, res) => {
    const sessions = await prisma.session.findMany({ include: sessionInclude, orderBy: [{ date: "desc" }] });
    res.json(sessions.map(serializeSession));
  })
);

// ---- Séances d'un jour donné (équivalent getSeancesDuJour) ----
sessionsRouter.get(
  "/jour",
  requireAuth("staff"),
  requireStats,
  asyncHandler(async (req, res) => {
    const dateString = req.query.date as string | undefined;
    if (!dateString) throw new AppError("Date requise.");
    const sessions = await prisma.session.findMany({
      where: { date: new Date(`${dateString}T00:00:00Z`), status: { not: "ANNULEE" } },
      include: sessionInclude,
    });
    res.json(sessions.map(serializeSession));
  })
);

// ---- Mes séances (encadreur connecté) ----
sessionsRouter.get(
  "/mine",
  requireAuth("tutor"),
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const sessions = await prisma.session.findMany({ where: { tutorId: session.sub }, include: sessionInclude, orderBy: { date: "desc" } });
    res.json(sessions.map(serializeSession));
  })
);

// ---- Modifier une séance (équivalent modifierSeance) ----
const updateSessionSchema = z.object({
  statut: z.enum(["PREVUE", "FAITE", "ANNULEE"]).optional(),
  tutorId: z.string().optional(),
});

sessionsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = updateSessionSchema.parse(req.body);
    const target = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!target) throw new NotFoundError("Séance introuvable.");

    const estStaffAutorise = session.kind === "staff" && session.canSeeStats;
    const estEncadreurProprietaire = session.kind === "tutor" && target.tutorId === session.sub;
    if (!estStaffAutorise && !estEncadreurProprietaire) throw new ForbiddenError("Tu ne peux modifier que tes propres séances.");

    if (data.tutorId && !estStaffAutorise) throw new ForbiddenError("Seuls l'administration et les superviseurs peuvent réassigner une séance.");
    if (data.tutorId) {
      const newTutor = await prisma.tutor.findUnique({ where: { id: data.tutorId } });
      if (!newTutor) throw new AppError("Encadreur introuvable.");
    }

    await prisma.session.update({
      where: { id: target.id },
      data: { status: data.statut, tutorId: data.tutorId },
    });
    res.json({ message: "Séance mise à jour." });
  })
);
