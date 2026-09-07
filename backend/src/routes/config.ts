import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../lib/asyncHandler.js";
import { getDefaultLocalityId } from "../lib/locality.js";
import { ensureCurrentSchoolYearPeriods } from "../lib/periodRows.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireStats } from "../middleware/auth.js";
import { currentPeriodKey } from "../services/periods.js";

export const configRouter = Router();

// Reprend getConfigNiveaux() + les allowlists base×niveau : tout ce dont le formulaire d'inscription
// (et l'écran de sélection classe côté encaissement) a besoin en un seul appel.
configRouter.get(
  "/reference",
  asyncHandler(async (_req, res) => {
    const localityId = await getDefaultLocalityId();
    const now = new Date();

    const [bases, niveaux, tariffs, allowlist, periods] = await Promise.all([
      prisma.base.findMany({ where: { localityId, active: true }, orderBy: { name: "asc" } }),
      prisma.niveau.findMany({
        where: { localityId },
        orderBy: { sortOrder: "asc" },
        include: { series: true },
      }),
      prisma.tariff.findMany({ where: { effectiveTo: null }, orderBy: { effectiveFrom: "desc" } }),
      prisma.baseNiveauAllowlist.findMany(),
      ensureCurrentSchoolYearPeriods(),
    ]);

    res.json({
      bases: bases.map((b) => ({ id: b.id, name: b.name, code: b.code })),
      niveaux: niveaux.map((n) => ({
        id: n.id,
        name: n.name,
        code: n.code,
        hasSeries: n.hasSeries,
        isExamClass: n.isExamClass,
        series: n.series.map((s) => ({ id: s.id, name: s.name })),
      })),
      tariffs: tariffs.map((t) => ({
        niveauId: t.niveauId,
        serieId: t.serieId,
        baseId: t.baseId,
        monthlyAmount: Number(t.monthlyAmount),
        registrationFee: Number(t.registrationFee),
      })),
      // { baseId, niveauId, serieId } — remplace _baseAutorisePourNiveau() côté frontend :
      // une combinaison absente de cette liste n'est pas proposée au staff.
      allowlist: allowlist.map((a) => ({ baseId: a.baseId, niveauId: a.niveauId, serieId: a.serieId })),
      periods,
      currentPeriodKey: currentPeriodKey(periods, now),
    });
  })
);

// Reprend getConfigCreneaux()
configRouter.get(
  "/creneaux",
  asyncHandler(async (_req, res) => {
    const localityId = await getDefaultLocalityId();
    const slots = await prisma.scheduleSlot.findMany({ where: { localityId }, orderBy: [{ dayOfWeek: "asc" }, { label: "asc" }] });
    res.json(
      slots.map((s) => ({ id: s.id, dayOfWeek: s.dayOfWeek, label: s.label, appliesToAllNiveaux: s.appliesToAllNiveaux }))
    );
  })
);

// Liste des écoles (autocomplete du formulaire d'inscription) — plus une liste figée dans le HTML,
// une vraie table alimentée par le seed + les upserts faits à chaque inscription avec une école inédite.
configRouter.get(
  "/schools",
  asyncHandler(async (_req, res) => {
    const schools = await prisma.school.findMany({ orderBy: { name: "asc" } });
    res.json(schools.map((s) => s.name));
  })
);

// Reprend getListeMatieres()
configRouter.get(
  "/matieres",
  asyncHandler(async (_req, res) => {
    const matieres = await prisma.matiere.findMany({ orderBy: { name: "asc" } });
    res.json(matieres.map((m) => ({ id: m.id, name: m.name })));
  })
);

// Reprend getCategoriesAnciennete()
configRouter.get(
  "/categories-anciennete",
  asyncHandler(async (_req, res) => {
    const localityId = await getDefaultLocalityId();
    const tiers = await prisma.seniorityTier.findMany({ where: { localityId }, orderBy: { sortOrder: "asc" } });
    res.json(tiers.map((t) => ({ id: t.id, nom: t.name, taux: Number(t.ratePerSession) })));
  })
);

// Reprend getTypesSeance() — vocabulaire fixe, pas besoin d'une table.
configRouter.get("/types-seance", (_req, res) => {
  res.json(["NORMALE", "CONGES", "PREPA_BAC"]);
});

// Groupes requis par base×niveau×série (remplace GROUPES_TLE_D_ZAHER / _estCasGroupeTleDZaher côté frontend).
configRouter.get(
  "/groupes-seance",
  asyncHandler(async (_req, res) => {
    const groups = await prisma.sessionGroup.findMany();
    res.json(groups.map((g) => ({ baseId: g.baseId, niveauId: g.niveauId, serieId: g.serieId, label: g.label })));
  })
);

// Reprend configurerAnneeScolaire() — à exécuter une fois par an (rentrée de septembre).
configRouter.patch(
  "/annee-scolaire",
  requireAuth("staff"),
  requireStats,
  asyncHandler(async (req, res) => {
    const { anneeDebut } = z.object({ anneeDebut: z.number().int().min(2000).max(2100) }).parse(req.body);
    const localityId = await getDefaultLocalityId();
    await prisma.locality.update({ where: { id: localityId }, data: { currentSchoolYearStart: anneeDebut } });
    res.json({ message: `Année scolaire configurée : Septembre ${anneeDebut} → Avril ${anneeDebut + 1}.` });
  })
);
