// Port pur de la logique de calcul des impayés (coeur de getElevesEtGrille / getDashboardStats /
// getRecouvrementDetailPeriode dans Code.gs). Fonctions pures, sans DB — la couche routes se charge
// de charger les données (tarif, ajustements, paiements agrégés) et de leur passer ici.
import type { Period } from "./periods.js";

export type PaymentStatus = "avant" | "exonere" | "paye" | "partiel" | "impaye";

export interface PeriodStatus {
  periodKey: string;
  paye: number;
  du: number;
  statut: PaymentStatus;
  ajuste: boolean;
}

// Résout le montant dû pour un élève sur une période donnée :
// - null si la période précède le mois d'arrivée (l'élève n'est pas encore dû)
// - sinon l'ajustement ponctuel s'il existe, le montant mensuel par défaut autrement.
export function resolveAmountDue(params: {
  periods: Period[];
  periodKey: string;
  arrivalPeriodKey: string;
  defaultMonthlyAmount: number;
  adjustmentForPeriod: number | undefined; // undefined = pas d'ajustement pour cette période
}): { due: number; adjusted: boolean } | null {
  const { periods, periodKey, arrivalPeriodKey, defaultMonthlyAmount, adjustmentForPeriod } = params;

  const indexArrivee = periods.findIndex((p) => p.key === arrivalPeriodKey);
  const indexPeriode = periods.findIndex((p) => p.key === periodKey);
  if (indexArrivee !== -1 && indexPeriode < indexArrivee) return null; // pas encore arrivé ce mois-là

  if (adjustmentForPeriod !== undefined) return { due: adjustmentForPeriod, adjusted: true };
  return { due: defaultMonthlyAmount, adjusted: false };
}

export function computeStatus(paye: number, due: number): PaymentStatus {
  if (due === 0) return "exonere"; // pause, abandon, exonération...
  if (paye >= due) return "paye";
  if (paye > 0) return "partiel";
  return "impaye";
}

// Calcule le statut d'un élève sur toutes les périodes d'une année scolaire — équivalent du
// `.map()` central de getElevesEtGrille().
export function computePeriodStatuses(params: {
  periods: Period[];
  arrivalPeriodKey: string;
  defaultMonthlyAmount: number;
  paidByPeriod: Record<string, number>; // periodKey -> montant déjà encaissé (paiements "Mensualité")
  adjustmentsByPeriod: Record<string, number>; // periodKey -> montant dû ajusté ponctuellement
}): PeriodStatus[] {
  const { periods, arrivalPeriodKey, defaultMonthlyAmount, paidByPeriod, adjustmentsByPeriod } = params;

  return periods.map((p) => {
    const paye = paidByPeriod[p.key] ?? 0;
    const resolved = resolveAmountDue({
      periods,
      periodKey: p.key,
      arrivalPeriodKey,
      defaultMonthlyAmount,
      adjustmentForPeriod: adjustmentsByPeriod[p.key],
    });

    if (resolved === null) {
      return { periodKey: p.key, paye, du: 0, statut: "avant" as const, ajuste: false };
    }
    return { periodKey: p.key, paye, du: resolved.due, statut: computeStatus(paye, resolved.due), ajuste: resolved.adjusted };
  });
}
