import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { ensureCurrentSchoolYearPeriods } from "../lib/periodRows.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStats } from "../middleware/auth.js";
import { resolveAmountDue } from "../services/paymentStatus.js";
import { currentPeriodKey } from "../services/periods.js";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth("staff"), requireStats);

// Charge tout ce qu'il faut pour calculer l'attendu/encaissé par période — un seul aller-retour DB,
// réutilisé par les 3 routes ci-dessous (stats globales, détail d'une période, recette du jour).
async function loadRecouvrementContext() {
  const periods = await ensureCurrentSchoolYearPeriods();
  const [students, enrollments, adjustments, payments] = await Promise.all([
    prisma.student.findMany({ select: { id: true, baseId: true, niveauId: true } }),
    prisma.enrollment.findMany({ orderBy: { id: "desc" } }),
    prisma.monthlyAdjustment.findMany({ include: { period: true }, orderBy: { createdAt: "asc" } }),
    prisma.payment.findMany({ where: { type: "MENSUALITE" }, include: { period: true } }),
  ]);

  const latestEnrollmentByStudent = new Map<string, (typeof enrollments)[number]>();
  for (const e of enrollments) if (!latestEnrollmentByStudent.has(e.studentId)) latestEnrollmentByStudent.set(e.studentId, e);

  const adjustmentByStudentPeriod = new Map<string, number>();
  for (const a of adjustments) adjustmentByStudentPeriod.set(`${a.studentId}|${a.period.key}`, Number(a.amountDue));

  const paidByStudentPeriod = new Map<string, number>();
  for (const p of payments) {
    if (!p.period) continue;
    const key = `${p.studentId}|${p.period.key}`;
    paidByStudentPeriod.set(key, (paidByStudentPeriod.get(key) ?? 0) + Number(p.amount));
  }

  return { periods, students, latestEnrollmentByStudent, adjustmentByStudentPeriod, paidByStudentPeriod };
}

// ---- Tableau de bord (équivalent getDashboardStats) ----
dashboardRouter.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const { periods, students, latestEnrollmentByStudent, adjustmentByStudentPeriod, paidByStudentPeriod } = await loadRecouvrementContext();

    const [bases, niveaux, paymentTotals] = await Promise.all([
      prisma.base.findMany({ orderBy: { name: "asc" } }),
      prisma.niveau.findMany({ orderBy: { sortOrder: "asc" } }),
      prisma.payment.groupBy({ by: ["type"], _sum: { amount: true } }),
    ]);

    const repartitionBase = bases.map((b) => ({ base: b.name, count: students.filter((s) => s.baseId === b.id).length }));
    const repartitionNiveau = niveaux.map((n) => ({ niveau: n.name, count: students.filter((s) => s.niveauId === n.id).length }));

    const recouvrementParPeriode = periods.map((p) => {
      let du = 0;
      for (const s of students) {
        const enrollment = latestEnrollmentByStudent.get(s.id);
        if (!enrollment) continue;
        const resolved = resolveAmountDue({
          periods,
          periodKey: p.key,
          arrivalPeriodKey: enrollment.startPeriodKey,
          defaultMonthlyAmount: Number(enrollment.monthlyAmountOverride ?? 0),
          adjustmentForPeriod: adjustmentByStudentPeriod.get(`${s.id}|${p.key}`),
        });
        if (resolved) du += resolved.due;
      }
      const encaisse = students.reduce((sum, s) => sum + (paidByStudentPeriod.get(`${s.id}|${p.key}`) ?? 0), 0);
      return { periodeKey: p.key, periode: p.label, du, encaisse };
    });

    const totalInscriptions = Number(paymentTotals.find((t) => t.type === "INSCRIPTION")?._sum.amount ?? 0);
    const totalMensualites = Number(paymentTotals.find((t) => t.type === "MENSUALITE")?._sum.amount ?? 0);

    res.json({
      totalEleves: students.length,
      totalInscriptions,
      totalMensualites,
      totalEncaisse: totalInscriptions + totalMensualites,
      repartitionBase,
      repartitionNiveau,
      recouvrementParPeriode,
      periodeCouranteKey: currentPeriodKey(periods, new Date()),
    });
  })
);

// ---- Détail attendu/encaissé pour une période (équivalent getRecouvrementDetailPeriode) ----
dashboardRouter.get(
  "/recouvrement",
  asyncHandler(async (req, res) => {
    const periodKey = req.query.periode as string | undefined;
    if (!periodKey) throw new AppError("Période requise.");

    const { periods, students, latestEnrollmentByStudent, adjustmentByStudentPeriod, paidByStudentPeriod } = await loadRecouvrementContext();
    const period = periods.find((p) => p.key === periodKey);
    if (!period) throw new AppError("Période invalide.");

    const [bases, niveaux] = await Promise.all([prisma.base.findMany({ orderBy: { name: "asc" } }), prisma.niveau.findMany({ orderBy: { sortOrder: "asc" } })]);

    const parBase = bases.map((b) => ({ base: b.name, attendu: 0, encaisse: 0 }));
    const parNiveau = niveaux.map((n) => ({ niveau: n.name, attendu: 0, encaisse: 0 }));
    let totalAttendu = 0;
    let totalEncaisse = 0;

    for (const s of students) {
      const enrollment = latestEnrollmentByStudent.get(s.id);
      if (!enrollment) continue;
      const resolved = resolveAmountDue({
        periods,
        periodKey: period.key,
        arrivalPeriodKey: enrollment.startPeriodKey,
        defaultMonthlyAmount: Number(enrollment.monthlyAmountOverride ?? 0),
        adjustmentForPeriod: adjustmentByStudentPeriod.get(`${s.id}|${period.key}`),
      });
      const encaisse = paidByStudentPeriod.get(`${s.id}|${period.key}`) ?? 0;
      if (resolved) {
        const iBase = bases.findIndex((b) => b.id === s.baseId);
        const iNiveau = niveaux.findIndex((n) => n.id === s.niveauId);
        if (iBase !== -1) parBase[iBase].attendu += resolved.due;
        if (iNiveau !== -1) parNiveau[iNiveau].attendu += resolved.due;
        totalAttendu += resolved.due;
      }
      const iBase = bases.findIndex((b) => b.id === s.baseId);
      const iNiveau = niveaux.findIndex((n) => n.id === s.niveauId);
      if (iBase !== -1) parBase[iBase].encaisse += encaisse;
      if (iNiveau !== -1) parNiveau[iNiveau].encaisse += encaisse;
      totalEncaisse += encaisse;
    }

    res.json({ periodeLabel: period.label, parBase, parNiveau, totalAttendu, totalEncaisse });
  })
);

// ---- Recette du jour, tous types de paiement confondus (équivalent getStatsDuJour) ----
dashboardRouter.get(
  "/jour",
  asyncHandler(async (req, res) => {
    const dateString = req.query.date as string | undefined;
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) throw new AppError("Date invalide.");

    const start = new Date(`${dateString}T00:00:00`);
    const end = new Date(`${dateString}T23:59:59.999`);
    const agg = await prisma.payment.aggregate({ where: { createdAt: { gte: start, lte: end } }, _sum: { amount: true } });
    res.json({ total: Number(agg._sum.amount ?? 0) });
  })
);
