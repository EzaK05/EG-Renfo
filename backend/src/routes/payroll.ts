import { Router } from "express";
import { asyncHandler } from "../lib/asyncHandler.js";
import { AppError } from "../lib/errors.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStats } from "../middleware/auth.js";
import { computePayroll, type PayrollSession } from "../services/payroll.js";

export const payrollRouter = Router();

function inRange(dateIso: string, debut?: string, fin?: string): boolean {
  if (debut && dateIso < debut) return false;
  if (fin && dateIso > fin) return false;
  return true;
}

// ---- Ma paie (encadreur connecté) — équivalent getMaPaie ----
payrollRouter.get(
  "/mine",
  requireAuth("tutor"),
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const { debut, fin } = req.query as { debut?: string; fin?: string };

    const tutor = await prisma.tutor.findUnique({ where: { id: session.sub }, include: { seniorityTier: true } });
    if (!tutor) throw new AppError("Profil introuvable.");

    const sessions = await prisma.session.findMany({ where: { tutorId: tutor.id, status: "FAITE" } });
    const filtered: PayrollSession[] = sessions
      .filter((s) => inRange(s.date.toISOString().slice(0, 10), debut, fin))
      .map((s) => ({ type: s.type, status: s.status }));

    const payroll = computePayroll(filtered, Number(tutor.seniorityTier.ratePerSession));
    res.json({ categorieAnciennete: tutor.seniorityTier.name, tauxParSeance: Number(tutor.seniorityTier.ratePerSession), ...payroll });
  })
);

// ---- Évolution mensuelle (équivalent getEvolutionEncadreur) ----
payrollRouter.get(
  "/mine/evolution",
  requireAuth("tutor"),
  asyncHandler(async (req, res) => {
    const session = req.session as any;
    const tutor = await prisma.tutor.findUnique({ where: { id: session.sub }, include: { seniorityTier: true } });
    if (!tutor) throw new AppError("Profil introuvable.");

    const sessions = await prisma.session.findMany({ where: { tutorId: tutor.id, status: "FAITE", type: "NORMALE" } });
    const parMois: Record<string, number> = {};
    for (const s of sessions) {
      const cle = s.date.toISOString().slice(0, 7);
      parMois[cle] = (parMois[cle] ?? 0) + 1;
    }

    const taux = Number(tutor.seniorityTier.ratePerSession);
    const result = Object.keys(parMois)
      .sort()
      .map((cle) => {
        const equivalentSeances = parMois[cle] * 0.5;
        return { periode: cle, nombreSeances: equivalentSeances, montant: equivalentSeances * taux };
      });
    res.json(result);
  })
);

// ---- Rapport salaires global (équivalent getRapportSalaires) ----
payrollRouter.get(
  "/",
  requireAuth("staff"),
  requireStats,
  asyncHandler(async (req, res) => {
    const { debut, fin } = req.query as { debut?: string; fin?: string };
    const tutors = await prisma.tutor.findMany({ include: { seniorityTier: true, sessions: { where: { status: "FAITE" } } } });

    const result = tutors.map((t) => {
      const filtered: PayrollSession[] = t.sessions
        .filter((s) => inRange(s.date.toISOString().slice(0, 10), debut, fin))
        .map((s) => ({ type: s.type, status: s.status }));
      const payroll = computePayroll(filtered, Number(t.seniorityTier.ratePerSession));
      return {
        id: t.displayId,
        nom: t.lastName,
        prenoms: t.firstName,
        statut: t.status,
        categorieAnciennete: t.seniorityTier.name,
        tauxParSeance: Number(t.seniorityTier.ratePerSession),
        ...payroll,
      };
    });
    res.json(result);
  })
);
