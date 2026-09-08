import { describe, expect, it } from "vitest";
import { computePeriods, currentPeriodKey, deriveSchoolYearStart, monthKey } from "./periods.js";

describe("deriveSchoolYearStart", () => {
  it("retourne l'année en cours à partir de septembre", () => {
    expect(deriveSchoolYearStart(new Date(2026, 8, 15))).toBe(2026); // Septembre = mois index 8
  });
  it("retourne l'année précédente avant septembre", () => {
    expect(deriveSchoolYearStart(new Date(2026, 5, 15))).toBe(2025); // Juin
  });
});

describe("computePeriods", () => {
  it("fusionne septembre et octobre en une seule période", () => {
    const periods = computePeriods(2026);
    expect(periods).toHaveLength(7);
    expect(periods[0]).toEqual({ key: "2026-09", label: "Septembre-Octobre 2026" });
    expect(periods[periods.length - 1]).toEqual({ key: "2027-04", label: "Avril 2027" });
  });
});

describe("currentPeriodKey", () => {
  const periods = computePeriods(2026);

  it("retourne la première période avant la rentrée (Mai-Août)", () => {
    expect(currentPeriodKey(periods, new Date(2026, 6, 1))).toBe("2026-09"); // Juillet
  });
  it("retourne la période de septembre pour un jour d'octobre (pas de clé propre)", () => {
    expect(currentPeriodKey(periods, new Date(2026, 9, 20))).toBe("2026-09");
  });
  it("retourne la dernière période déjà commencée", () => {
    expect(currentPeriodKey(periods, new Date(2027, 1, 10))).toBe("2027-02"); // Février
  });
});

describe("monthKey", () => {
  it("formate en AAAA-MM avec zéro-padding", () => {
    expect(monthKey(new Date(2026, 0, 5))).toBe("2026-01");
  });
});
