import argon2 from "argon2";
import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError, ForbiddenError, NotFoundError } from "../lib/errors.js";
import { ensureCurrentSchoolYearPeriods } from "../lib/periodRows.js";
import { prisma } from "../lib/prisma.js";
import { findEffectiveTariff } from "../lib/tariff.js";
import { requireAuth, requireStats } from "../middleware/auth.js";
import { computePeriodStatuses } from "../services/paymentStatus.js";
import { generatePin } from "../services/pin.js";
import { nextIdInSequence } from "../services/sequentialId.js";

export const studentsRouter = Router();
studentsRouter.use(requireAuth("staff"));

// Un compte staff verrouillé sur une base (session.baseId non nul) ne peut agir que sur cette base —
// remplace `if (session.base) payload.base = session.base` répété dans chaque fonction de Code.gs.
function resolveBaseId(session: { baseId: string | null }, requested: string | undefined | null): string {
  if (session.baseId) return session.baseId;
  if (!requested) throw new AppError("Base invalide ou non spécifiée.");
  return requested;
}

// ---- Inscription (équivalent enregistrerEleve) ----
const registerSchema = z.object({
  baseId: z.string().optional(),
  niveauId: z.string(),
  serieId: z.string().optional().nullable(),
  nom: z.string().min(1),
  prenoms: z.string().min(1),
  sexe: z.enum(["M", "F"]),
  ecole: z.string().optional(),
  ecoleAutre: z.string().optional(),
  matriculeLycee: z.string().min(1),
  telEleve: z.string().optional(),
  telParent: z.string().optional(),
  isSocial: z.boolean().default(false),
  montantMensuelSocial: z.number().optional(),
  fraisInscriptionSocial: z.number().optional(),
  moisArrivee: z.string(),
  moyenInscription: z.enum(["Espèces", "Wave", "Orange Money"]),
  tierceInscription: z.string().optional(),
});

studentsRouter.post(
  "/",
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = registerSchema.parse(req.body);
    const baseId = resolveBaseId(session, data.baseId);

    const [base, niveau, periods] = await Promise.all([
      prisma.base.findUnique({ where: { id: baseId } }),
      prisma.niveau.findUnique({ where: { id: data.niveauId }, include: { series: true } }),
      ensureCurrentSchoolYearPeriods(),
    ]);
    if (!base) throw new AppError("Base invalide ou non spécifiée.");
    if (!niveau) throw new AppError("Niveau invalide.");

    let serie: { id: string; name: string } | null = null;
    if (niveau.hasSeries) {
      if (!data.serieId) throw new AppError(`Série requise pour ${niveau.name}.`);
      const found = niveau.series.find((s) => s.id === data.serieId);
      if (!found) throw new AppError("Série invalide pour ce niveau.");
      serie = found;
    }

    // Remplace _baseAutorisePourNiveau() : plus de règle nommée par base, juste une table de config.
    const allowed = await prisma.baseNiveauAllowlist.findFirst({
      where: { baseId, niveauId: niveau.id, serieId: serie?.id ?? null },
    });
    if (!allowed) {
      throw new AppError(`⚠️ ${base.name} n'accueille pas ce profil (${niveau.name}${serie ? " " + serie.name : ""}).`);
    }

    if (!periods.some((p) => p.key === data.moisArrivee)) throw new AppError("Mois d'arrivée invalide.");

    // Doublon (Nom + Prénoms, toutes bases confondues)
    const doublon = await prisma.student.findFirst({
      where: { lastName: { equals: data.nom, mode: "insensitive" }, firstName: { equals: data.prenoms, mode: "insensitive" } },
      include: { base: true, niveau: true },
    });
    if (doublon) {
      throw new AppError(
        `⚠️ Doublon détecté : ${data.nom.toUpperCase()} ${data.prenoms} est déjà inscrit(e) — ${doublon.base.name} / ${doublon.niveau.name} (ID : ${doublon.displayId}).`
      );
    }

    const tariff = await findEffectiveTariff(niveau.id, serie?.id ?? null, baseId);
    if (!tariff) throw new AppError("Aucun tarif configuré pour ce niveau — contacte l'administration.");

    const montantMensuel = data.isSocial && data.montantMensuelSocial !== undefined ? data.montantMensuelSocial : Number(tariff.monthlyAmount);
    const fraisInscription = data.isSocial && data.fraisInscriptionSocial !== undefined ? data.fraisInscriptionSocial : Number(tariff.registrationFee);

    let school = null;
    const nomEcole = data.ecole === "Autre" ? data.ecoleAutre : data.ecole;
    if (nomEcole) {
      school = await prisma.school.upsert({ where: { name: nomEcole }, update: {}, create: { name: nomEcole } });
    }

    const prefix = base.code + niveau.code + (serie?.name ?? "");
    const existingIds = (await prisma.student.findMany({ where: { displayId: { startsWith: prefix } }, select: { displayId: true } })).map(
      (s) => s.displayId
    );
    const displayId = nextIdInSequence(existingIds, prefix);
    const pin = generatePin(4);
    const pinHash = await argon2.hash(pin);

    const student = await prisma.$transaction(async (tx) => {
      const created = await tx.student.create({
        data: {
          baseId,
          niveauId: niveau.id,
          serieId: serie?.id ?? null,
          firstName: data.prenoms,
          lastName: data.nom.toUpperCase(),
          sex: data.sexe,
          schoolId: school?.id ?? null,
          matriculeLycee: data.matriculeLycee.trim().toUpperCase(),
          phoneStudent: data.telEleve || null,
          phoneParent: data.telParent || null,
          isCasSocial: data.isSocial,
          pinHash,
          displayId,
        },
      });

      await tx.enrollment.create({
        data: {
          studentId: created.id,
          baseId,
          niveauId: niveau.id,
          serieId: serie?.id ?? null,
          startPeriodKey: data.moisArrivee,
          monthlyAmountOverride: montantMensuel,
          registrationFeeOverride: fraisInscription,
        },
      });

      await tx.payment.create({
        data: {
          studentId: created.id,
          baseId,
          type: "INSCRIPTION",
          amount: fraisInscription,
          paymentMethod: data.moyenInscription,
          payerNote: data.tierceInscription || null,
          collectedByUserId: session.sub,
        },
      });

      return created;
    });

    res.status(201).json({ id: student.displayId, nom: `${student.lastName} ${student.firstName}`, montantMensuel, pin });
  })
);

// ---- Liste + grille de paiement (équivalent getElevesEtGrille) ----
studentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const baseId = resolveBaseId(session, req.query.baseId as string | undefined);
    const niveauId = req.query.niveauId as string | undefined;
    const serieId = (req.query.serieId as string | undefined) || null;

    const periods = await ensureCurrentSchoolYearPeriods();
    if (!niveauId) return res.json({ periods, eleves: [] });

    const where = { baseId, niveauId, ...(serieId ? { serieId } : {}) };
    const [students, enrollments, payments, adjustments] = await Promise.all([
      prisma.student.findMany({ where }),
      prisma.enrollment.findMany({ where, orderBy: { id: "desc" } }),
      prisma.payment.findMany({ where: { baseId, type: "MENSUALITE" }, include: { period: true } }),
      prisma.monthlyAdjustment.findMany({ include: { period: true } }),
    ]);

    const latestEnrollmentByStudent = new Map<string, (typeof enrollments)[number]>();
    for (const e of enrollments) if (!latestEnrollmentByStudent.has(e.studentId)) latestEnrollmentByStudent.set(e.studentId, e);

    // Regroupement par élève+période pour un accès O(1) dans la boucle de calcul du statut.
    const paidByStudentPeriod: Record<string, number> = {};
    for (const p of payments) {
      if (!p.period) continue;
      const key = `${p.studentId}|${p.period.key}`;
      paidByStudentPeriod[key] = (paidByStudentPeriod[key] ?? 0) + Number(p.amount);
    }
    const adjustmentByStudentPeriod: Record<string, number> = {};
    for (const a of adjustments.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())) {
      // Le dernier ajustement enregistré pour un couple (élève, période) fait foi — comme dans Code.gs.
      adjustmentByStudentPeriod[`${a.studentId}|${a.period.key}`] = Number(a.amountDue);
    }

    const eleves = students
      .map((s) => {
        const enrollment = latestEnrollmentByStudent.get(s.id);
        const defaultMonthlyAmount = Number(enrollment?.monthlyAmountOverride ?? 0);
        const paidByPeriod: Record<string, number> = {};
        const adjustmentsForStudent: Record<string, number> = {};
        for (const p of periods) {
          paidByPeriod[p.key] = paidByStudentPeriod[`${s.id}|${p.key}`] ?? 0;
          const adj = adjustmentByStudentPeriod[`${s.id}|${p.key}`];
          if (adj !== undefined) adjustmentsForStudent[p.key] = adj;
        }

        return {
          id: s.displayId,
          nom: s.lastName,
          prenoms: s.firstName,
          casSocial: s.isCasSocial,
          moisArrivee: enrollment?.startPeriodKey ?? periods[0].key,
          montantMensuel: defaultMonthlyAmount,
          statutParPeriode: Object.fromEntries(
            computePeriodStatuses({
              periods,
              arrivalPeriodKey: enrollment?.startPeriodKey ?? periods[0].key,
              defaultMonthlyAmount,
              paidByPeriod,
              adjustmentsByPeriod: adjustmentsForStudent,
            }).map((st) => [st.periodKey, st])
          ),
        };
      })
      .sort((a, b) => (a.nom + a.prenoms).localeCompare(b.nom + b.prenoms));

    res.json({ periods, eleves });
  })
);

// ---- Encaissement mensuel (équivalent enregistrerPaiementMensuel) ----
const paiementMensuelSchema = z.object({
  periodKey: z.string(),
  montant: z.number().positive(),
  moyen: z.enum(["Espèces", "Wave", "Orange Money"]),
  tierce: z.string().optional(),
});

studentsRouter.post(
  "/:displayId/paiements",
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = paiementMensuelSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { displayId: req.params.displayId } });
    if (!student) throw new NotFoundError("Élève introuvable.");
    if (session.baseId && session.baseId !== student.baseId) throw new ForbiddenError("Cet élève n'est pas sur ta base.");

    const periods = await ensureCurrentSchoolYearPeriods();
    const period = periods.find((p) => p.key === data.periodKey);
    if (!period) throw new AppError("Période invalide.");

    const [enrollment, adjustment, alreadyPaidAgg] = await Promise.all([
      prisma.enrollment.findFirst({ where: { studentId: student.id }, orderBy: { id: "desc" } }),
      prisma.monthlyAdjustment.findFirst({ where: { studentId: student.id, periodId: period.id }, orderBy: { createdAt: "desc" } }),
      prisma.payment.aggregate({ where: { studentId: student.id, periodId: period.id, type: "MENSUALITE" }, _sum: { amount: true } }),
    ]);

    const defaultMonthlyAmount = Number(enrollment?.monthlyAmountOverride ?? 0);
    const due = adjustment ? Number(adjustment.amountDue) : defaultMonthlyAmount;
    const dejaPaye = Number(alreadyPaidAgg._sum.amount ?? 0);
    const restant = Math.max(0, due - dejaPaye);
    if (data.montant > restant) {
      throw new AppError(`Montant trop élevé : il reste ${restant} FCFA à payer pour ce mois (déjà encaissé : ${dejaPaye} sur ${due} dû).`);
    }

    await prisma.payment.create({
      data: {
        studentId: student.id,
        baseId: student.baseId,
        type: "MENSUALITE",
        periodId: period.id,
        amount: data.montant,
        paymentMethod: data.moyen,
        payerNote: data.tierce || null,
        collectedByUserId: session.sub,
      },
    });

    res.status(201).json({ message: "Paiement enregistré avec succès !" });
  })
);

// ---- Ajustement ponctuel (équivalent definirMontantDuPeriode) ----
const adjustmentSchema = z.object({ periodKey: z.string(), montantDu: z.number().min(0), motif: z.string().optional() });

studentsRouter.post(
  "/:displayId/ajustements",
  requireStats,
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = adjustmentSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { displayId: req.params.displayId } });
    if (!student) throw new NotFoundError("Élève introuvable.");

    const periods = await ensureCurrentSchoolYearPeriods();
    const period = periods.find((p) => p.key === data.periodKey);
    if (!period) throw new AppError("Période invalide.");

    await prisma.monthlyAdjustment.create({
      data: { studentId: student.id, periodId: period.id, amountDue: data.montantDu, reason: data.motif, setByUserId: session.sub },
    });
    res.json({ message: "Montant dû mis à jour pour cette période." });
  })
);

// ---- Ajustement en plage (équivalent definirMontantDuPlage) ----
const adjustmentRangeSchema = z.object({ periodDebut: z.string(), periodFin: z.string(), montantDu: z.number().min(0), motif: z.string().optional() });

studentsRouter.post(
  "/:displayId/ajustements/plage",
  requireStats,
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const data = adjustmentRangeSchema.parse(req.body);
    const student = await prisma.student.findUnique({ where: { displayId: req.params.displayId } });
    if (!student) throw new NotFoundError("Élève introuvable.");

    const periods = await ensureCurrentSchoolYearPeriods();
    const iDebut = periods.findIndex((p) => p.key === data.periodDebut);
    const iFin = periods.findIndex((p) => p.key === data.periodFin);
    if (iDebut === -1 || iFin === -1 || iFin < iDebut) throw new AppError("Plage de périodes invalide.");

    const cible = periods.slice(iDebut, iFin + 1);
    await prisma.monthlyAdjustment.createMany({
      data: cible.map((p) => ({ studentId: student.id, periodId: p.id, amountDue: data.montantDu, reason: data.motif, setByUserId: session.sub })),
    });
    res.json({ message: `Montant dû mis à jour sur ${cible.length} mois.` });
  })
);
