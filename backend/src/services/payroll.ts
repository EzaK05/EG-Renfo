// Port pur du calcul de paie encadreur (getMaPaie / getRapportSalaires / getEvolutionEncadreur dans Code.gs).
// Règle métier : seuls les blocs de type "NORMALE" et de statut "FAITE" suivent le barème d'ancienneté ;
// 2 blocs de 4h = 1 séance payée (d'où le facteur 0.5), un bloc isolé = une demi-séance.
export interface PayrollSession {
  type: "NORMALE" | "CONGES" | "PREPA_BAC";
  status: "PREVUE" | "FAITE" | "ANNULEE";
}

export interface PayrollResult {
  nombreBlocs: number;
  nombreBlocsHorsBareme: number;
  equivalentSeances: number;
  salaireTotal: number;
}

export function computePayroll(sessions: PayrollSession[], ratePerSession: number): PayrollResult {
  const done = sessions.filter((s) => s.status === "FAITE");
  const nombreBlocs = done.filter((s) => s.type === "NORMALE").length;
  const nombreBlocsHorsBareme = done.filter((s) => s.type !== "NORMALE").length;
  const equivalentSeances = nombreBlocs * 0.5;

  return {
    nombreBlocs,
    nombreBlocsHorsBareme,
    equivalentSeances,
    salaireTotal: equivalentSeances * ratePerSession,
  };
}
