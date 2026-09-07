import { describe, expect, it } from "vitest";
import { computePeriods } from "./periods.js";
import { computePeriodStatuses, computeStatus, resolveAmountDue } from "./paymentStatus.js";

const periods = computePeriods(2026);

describe("resolveAmountDue", () => {
  it("retourne null avant le mois d'arrivée", () => {
    const res = resolveAmountDue({
      periods,
      periodKey: "2026-09",
      arrivalPeriodKey: "2026-11",
      defaultMonthlyAmount: 5000,
      adjustmentForPeriod: undefined,
    });
    expect(res).toBeNull();
  });

  it("retourne le montant mensuel par défaut sans ajustement", () => {
    const res = resolveAmountDue({
      periods,
      periodKey: "2026-11",
      arrivalPeriodKey: "2026-09",
      defaultMonthlyAmount: 5000,
      adjustmentForPeriod: undefined,
    });
    expect(res).toEqual({ due: 5000, adjusted: false });
  });

  it("l'ajustement ponctuel a priorité sur le montant par défaut (ex: Cas Social à 0)", () => {
    const res = resolveAmountDue({
      periods,
      periodKey: "2026-11",
      arrivalPeriodKey: "2026-09",
      defaultMonthlyAmount: 5000,
      adjustmentForPeriod: 0,
    });
    expect(res).toEqual({ due: 0, adjusted: true });
  });
});

describe("computeStatus", () => {
  it("exonéré si le montant dû est 0", () => {
    expect(computeStatus(0, 0)).toBe("exonere");
  });
  it("payé si le montant encaissé couvre le dû", () => {
    expect(computeStatus(5000, 5000)).toBe("paye");
    expect(computeStatus(6000, 5000)).toBe("paye");
  });
  it("partiel si un montant a été encaissé sans couvrir le dû", () => {
    expect(computeStatus(2000, 5000)).toBe("partiel");
  });
  it("impayé si rien n'a été encaissé", () => {
    expect(computeStatus(0, 5000)).toBe("impaye");
  });
});

describe("computePeriodStatuses", () => {
  it("calcule le statut sur toute l'année scolaire pour un élève arrivé en cours d'année", () => {
    const statuses = computePeriodStatuses({
      periods,
      arrivalPeriodKey: "2026-11",
      defaultMonthlyAmount: 5000,
      paidByPeriod: { "2026-11": 5000, "2026-12": 2000 },
      adjustmentsByPeriod: {},
    });

    expect(statuses[0]).toMatchObject({ periodKey: "2026-09", statut: "avant", du: 0 });
    expect(statuses[1]).toMatchObject({ periodKey: "2026-11", statut: "paye", du: 5000, paye: 5000 });
    expect(statuses[2]).toMatchObject({ periodKey: "2026-12", statut: "partiel", du: 5000, paye: 2000 });
    expect(statuses[3]).toMatchObject({ periodKey: "2027-01", statut: "impaye", du: 5000, paye: 0 });
  });

  it("un ajustement à 0 sur une période précise exonère seulement cette période", () => {
    const statuses = computePeriodStatuses({
      periods,
      arrivalPeriodKey: "2026-09",
      defaultMonthlyAmount: 5000,
      paidByPeriod: {},
      adjustmentsByPeriod: { "2026-12": 0 },
    });

    expect(statuses.find((s) => s.periodKey === "2026-12")).toMatchObject({ statut: "exonere", du: 0, ajuste: true });
    expect(statuses.find((s) => s.periodKey === "2026-11")).toMatchObject({ statut: "impaye", du: 5000, ajuste: false });
  });
});
