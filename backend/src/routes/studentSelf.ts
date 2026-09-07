import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError, NotFoundError } from "../lib/errors.js";
import { ensureCurrentSchoolYearPeriods } from "../lib/periodRows.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import { computePeriodStatuses } from "../services/paymentStatus.js";

export const studentSelfRouter = Router();
studentSelfRouter.use(requireAuth("student"));

const TRIMESTRES = ["1er", "2e", "3e"];
const TYPES_NOTE = ["Devoir de Niveau", "Devoir de Classe", "Interrogation Écrite", "Interrogation Orale"];
const ECHELLES_NOTE = [10, 20];

async function getSelf(req: any) {
  const session = req.session;
  const student = await prisma.student.findUnique({ where: { id: session.sub }, include: { niveau: true } });
  if (!student) throw new NotFoundError("Profil introuvable.");
  return student;
}

async function assertMatiereValidPourNiveau(niveauId: string, matiereId: string) {
  const lien = await prisma.niveauMatiere.findUnique({ where: { niveauId_matiereId: { niveauId, matiereId } } });
  if (!lien) throw new AppError("Matière invalide.");
}

// ---- Profil (équivalent getMonProfilEleve) ----
studentSelfRouter.get(
  "/profil",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    res.json({
      id: s.displayId,
      nom: s.lastName,
      prenoms: s.firstName,
      sexe: s.sex,
      matriculeLycee: s.matriculeLycee ?? "",
      niveau: s.niveau.name,
    });
  })
);

// ---- Grille de paiement personnelle (équivalent getMaGrillePaiement) ----
studentSelfRouter.get(
  "/grille",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const periods = await ensureCurrentSchoolYearPeriods();

    const [enrollment, payments, adjustments] = await Promise.all([
      prisma.enrollment.findFirst({ where: { studentId: s.id }, orderBy: { id: "desc" } }),
      prisma.payment.findMany({ where: { studentId: s.id, type: "MENSUALITE" }, include: { period: true } }),
      prisma.monthlyAdjustment.findMany({ where: { studentId: s.id }, include: { period: true }, orderBy: { createdAt: "asc" } }),
    ]);

    const paidByPeriod: Record<string, number> = {};
    for (const p of payments) if (p.period) paidByPeriod[p.period.key] = (paidByPeriod[p.period.key] ?? 0) + Number(p.amount);
    const adjustmentsByPeriod: Record<string, number> = {};
    for (const a of adjustments) adjustmentsByPeriod[a.period.key] = Number(a.amountDue);

    const defaultMonthlyAmount = Number(enrollment?.monthlyAmountOverride ?? 0);
    res.json({
      periods,
      eleve: {
        id: s.displayId,
        nom: s.lastName,
        prenoms: s.firstName,
        montantMensuel: defaultMonthlyAmount,
        statutParPeriode: Object.fromEntries(
          computePeriodStatuses({
            periods,
            arrivalPeriodKey: enrollment?.startPeriodKey ?? periods[0].key,
            defaultMonthlyAmount,
            paidByPeriod,
            adjustmentsByPeriod,
          }).map((st) => [st.periodKey, st])
        ),
      },
    });
  })
);

// ---- Config de référence pour la saisie de notes (équivalent getConfigNotesEleve) ----
studentSelfRouter.get(
  "/config-notes",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const matieres = await prisma.niveauMatiere.findMany({ where: { niveauId: s.niveauId }, include: { matiere: true }, orderBy: { sortOrder: "asc" } });
    res.json({
      matieres: matieres.map((m) => ({ id: m.matiere.id, name: m.matiere.name })),
      typesNote: TYPES_NOTE,
      echelles: ECHELLES_NOTE,
      trimestres: TRIMESTRES,
      typesExamenBlanc: ["LOCAL", "REGIONAL"],
      estClasseExamen: s.niveau.isExamClass,
      bareme: s.niveau.mockExamBareme,
    });
  })
);

// ---- Notes (ajouterNoteEleve / getMesNotes / supprimerNoteEleve) ----
const noteSchema = z.object({
  trimestre: z.enum(["1er", "2e", "3e"]),
  matiereId: z.string(),
  type: z.enum(["Devoir de Niveau", "Devoir de Classe", "Interrogation Écrite", "Interrogation Orale"]),
  echelle: z.union([z.literal(10), z.literal(20)]),
  note: z.number(),
});

studentSelfRouter.post(
  "/notes",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const data = noteSchema.parse(req.body);
    if (data.note < 0 || data.note > data.echelle) throw new AppError(`Note invalide (doit être entre 0 et ${data.echelle}).`);
    await assertMatiereValidPourNiveau(s.niveauId, data.matiereId);

    const created = await prisma.studentGrade.create({
      data: { studentId: s.id, matiereId: data.matiereId, trimestre: data.trimestre, type: data.type, value: data.note, scale: data.echelle },
    });
    res.status(201).json({ id: created.id });
  })
);

studentSelfRouter.get(
  "/notes",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const notes = await prisma.studentGrade.findMany({ where: { studentId: s.id }, include: { matiere: true }, orderBy: { createdAt: "desc" } });
    res.json(notes.map((n) => ({ id: n.id, trimestre: n.trimestre, matiere: n.matiere.name, type: n.type, note: n.value, echelle: n.scale })));
  })
);

studentSelfRouter.delete(
  "/notes/:id",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const note = await prisma.studentGrade.findFirst({ where: { id: req.params.id, studentId: s.id } });
    if (!note) throw new NotFoundError("Note introuvable.");
    await prisma.studentGrade.delete({ where: { id: note.id } });
    res.json({ message: "Note supprimée." });
  })
);

// ---- Moyennes (ajouterMoyenneEleve / getMesMoyennes / supprimerMoyenneEleve) ----
const moyenneSchema = z.object({
  trimestre: z.enum(["1er", "2e", "3e"]),
  matiereId: z.string().optional(),
  generale: z.boolean().default(false),
  moyenne: z.number().min(0).max(20),
  rang: z.string().optional(),
});

studentSelfRouter.post(
  "/moyennes",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const data = moyenneSchema.parse(req.body);
    if (!data.generale) {
      if (!data.matiereId) throw new AppError("Matière invalide.");
      await assertMatiereValidPourNiveau(s.niveauId, data.matiereId);
    }

    const created = await prisma.studentAverage.create({
      data: { studentId: s.id, matiereId: data.generale ? null : data.matiereId, trimestre: data.trimestre, value: data.moyenne, rang: data.rang },
    });
    res.status(201).json({ id: created.id });
  })
);

studentSelfRouter.get(
  "/moyennes",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const moyennes = await prisma.studentAverage.findMany({ where: { studentId: s.id }, include: { matiere: true }, orderBy: { createdAt: "desc" } });
    res.json(
      moyennes.map((m) => ({
        id: m.id,
        trimestre: m.trimestre,
        matiere: m.matiere?.name ?? "",
        generale: m.matiereId === null,
        moyenne: m.value,
        rang: m.rang ?? "",
      }))
    );
  })
);

studentSelfRouter.delete(
  "/moyennes/:id",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const moyenne = await prisma.studentAverage.findFirst({ where: { id: req.params.id, studentId: s.id } });
    if (!moyenne) throw new NotFoundError("Moyenne introuvable.");
    await prisma.studentAverage.delete({ where: { id: moyenne.id } });
    res.json({ message: "Moyenne supprimée." });
  })
);

// ---- Examens blancs — matières (ajouterMatiereExamenBlanc / ...) ----
const examMatiereSchema = z.object({ type: z.enum(["LOCAL", "REGIONAL"]), matiereId: z.string(), note: z.number().min(0).max(20) });

studentSelfRouter.post(
  "/examens-blancs/matieres",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    if (!s.niveau.isExamClass) throw new AppError("Les examens blancs sont réservés aux classes d'examen (3e et Terminale).");
    const data = examMatiereSchema.parse(req.body);
    await assertMatiereValidPourNiveau(s.niveauId, data.matiereId);

    const created = await prisma.mockExamSubjectScore.create({
      data: { studentId: s.id, examType: data.type, matiereId: data.matiereId, score: data.note },
    });
    res.status(201).json({ id: created.id });
  })
);

studentSelfRouter.get(
  "/examens-blancs/matieres",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const rows = await prisma.mockExamSubjectScore.findMany({ where: { studentId: s.id }, include: { matiere: true } });
    res.json(rows.map((r) => ({ id: r.id, type: r.examType, matiere: r.matiere.name, note: r.score })));
  })
);

studentSelfRouter.delete(
  "/examens-blancs/matieres/:id",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const row = await prisma.mockExamSubjectScore.findFirst({ where: { id: req.params.id, studentId: s.id } });
    if (!row) throw new NotFoundError("Matière introuvable.");
    await prisma.mockExamSubjectScore.delete({ where: { id: row.id } });
    res.json({ message: "Matière retirée." });
  })
);

// ---- Examens blancs — totaux (ajouterTotalExamenBlanc / ...) ----
const examTotalSchema = z.object({ type: z.enum(["LOCAL", "REGIONAL"]), total: z.number().min(0) });

studentSelfRouter.post(
  "/examens-blancs/totaux",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    if (!s.niveau.isExamClass || !s.niveau.mockExamBareme) throw new AppError("Les examens blancs sont réservés aux classes d'examen (3e et Terminale).");
    const data = examTotalSchema.parse(req.body);
    if (data.total > s.niveau.mockExamBareme) throw new AppError(`Total invalide (doit être entre 0 et ${s.niveau.mockExamBareme}).`);

    const created = await prisma.mockExamTotal.create({
      data: { studentId: s.id, examType: data.type, total: data.total, bareme: s.niveau.mockExamBareme },
    });
    res.status(201).json({ id: created.id });
  })
);

studentSelfRouter.get(
  "/examens-blancs/totaux",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const rows = await prisma.mockExamTotal.findMany({ where: { studentId: s.id } });
    res.json(rows.map((r) => ({ id: r.id, type: r.examType, total: r.total, bareme: r.bareme })));
  })
);

studentSelfRouter.delete(
  "/examens-blancs/totaux/:id",
  asyncHandler(async (req, res) => {
    const s = await getSelf(req);
    const row = await prisma.mockExamTotal.findFirst({ where: { id: req.params.id, studentId: s.id } });
    if (!row) throw new NotFoundError("Total introuvable.");
    await prisma.mockExamTotal.delete({ where: { id: row.id } });
    res.json({ message: "Total supprimé." });
  })
);
