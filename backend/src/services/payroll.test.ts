import { describe, expect, it } from "vitest";
import { computePayroll } from "./payroll.js";

describe("computePayroll", () => {
  it("2 blocs Normale = 1 séance équivalente payée au taux", () => {
    const result = computePayroll(
      [
        { type: "NORMALE", status: "FAITE" },
        { type: "NORMALE", status: "FAITE" },
      ],
      6000
    );
    expect(result).toEqual({ nombreBlocs: 2, nombreBlocsHorsBareme: 0, equivalentSeances: 1, salaireTotal: 6000 });
  });

  it("un bloc isolé = une demi-séance", () => {
    const result = computePayroll([{ type: "NORMALE", status: "FAITE" }], 6000);
    expect(result.equivalentSeances).toBe(0.5);
    expect(result.salaireTotal).toBe(3000);
  });

  it("ignore les séances non 'FAITE' (Prévue/Annulée)", () => {
    const result = computePayroll(
      [
        { type: "NORMALE", status: "PREVUE" },
        { type: "NORMALE", status: "ANNULEE" },
        { type: "NORMALE", status: "FAITE" },
      ],
      6000
    );
    expect(result.nombreBlocs).toBe(1);
  });

  it("compte séparément les blocs hors barème (Congés/Prépa BAC) sans les payer au tarif normal", () => {
    const result = computePayroll(
      [
        { type: "NORMALE", status: "FAITE" },
        { type: "CONGES", status: "FAITE" },
        { type: "PREPA_BAC", status: "FAITE" },
      ],
      6000
    );
    expect(result.nombreBlocs).toBe(1);
    expect(result.nombreBlocsHorsBareme).toBe(2);
    expect(result.salaireTotal).toBe(3000);
  });
});
