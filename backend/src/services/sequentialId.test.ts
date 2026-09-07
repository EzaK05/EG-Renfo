import { describe, expect, it } from "vitest";
import { nextIdInSequence } from "./sequentialId.js";

describe("nextIdInSequence", () => {
  it("commence à 001 si aucun ID existant avec ce préfixe", () => {
    expect(nextIdInSequence([], "ZAH6")).toBe("ZAH6001");
  });

  it("ignore les ID d'un autre préfixe (ex: ZAH6 vs ZAH2A)", () => {
    expect(nextIdInSequence(["ZAH2A001", "ZAH2A002"], "ZAH6")).toBe("ZAH6001");
  });

  it("reprend après le plus grand suffixe existant", () => {
    expect(nextIdInSequence(["ZAH6001", "ZAH6002", "ZAH6003"], "ZAH6")).toBe("ZAH6004");
  });

  it("n'est pas perturbé par un trou dans la séquence (élève supprimé)", () => {
    expect(nextIdInSequence(["ZAH6001", "ZAH6005"], "ZAH6")).toBe("ZAH6006");
  });
});
