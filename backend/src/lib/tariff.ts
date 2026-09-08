import { prisma } from "./prisma.js";

// Résout le tarif applicable pour un couple niveau/série(/base) : un tarif spécifique à une base
// (Tariff.baseId non nul) a priorité sur le tarif général du niveau (Tariff.baseId nul).
// Remplace l'accès direct à NIVEAUX[niveau].montantMensuel dans Code.gs — Tariff est désormais une
// vraie table avec historique (effectiveFrom/effectiveTo), voir Phase 2 du plan.
export async function findEffectiveTariff(niveauId: string, serieId: string | null, baseId: string) {
  const [specific, general] = await Promise.all([
    prisma.tariff.findFirst({
      where: { niveauId, serieId, baseId, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.tariff.findFirst({
      where: { niveauId, serieId, baseId: null, effectiveTo: null },
      orderBy: { effectiveFrom: "desc" },
    }),
  ]);
  return specific ?? general;
}
