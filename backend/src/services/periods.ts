// Port pur de _getPeriodes() / _getPeriodeCouranteKey() / _getAnneeScolaireDebut() (Code.gs).
// Fonctions pures et testables sans DB — priorité n°1 de la Phase 4 du plan (calculs financiers/temporels).

export interface Period {
  key: string; // "2026-09"
  label: string; // "Septembre-Octobre 2026"
}

// Année scolaire : Septembre → Avril. Repli si aucune configuration explicite n'existe pour la localité.
export function deriveSchoolYearStart(now: Date): number {
  const mois = now.getMonth() + 1; // 1-12
  return mois >= 9 ? now.getFullYear() : now.getFullYear() - 1;
}

// Septembre et Octobre sont fusionnés en une seule période (comme dans l'app GAS d'origine).
export function computePeriods(schoolYearStart: number): Period[] {
  const anneeSuivante = schoolYearStart + 1;
  return [
    { key: `${schoolYearStart}-09`, label: `Septembre-Octobre ${schoolYearStart}` },
    { key: `${schoolYearStart}-11`, label: `Novembre ${schoolYearStart}` },
    { key: `${schoolYearStart}-12`, label: `Décembre ${schoolYearStart}` },
    { key: `${anneeSuivante}-01`, label: `Janvier ${anneeSuivante}` },
    { key: `${anneeSuivante}-02`, label: `Février ${anneeSuivante}` },
    { key: `${anneeSuivante}-03`, label: `Mars ${anneeSuivante}` },
    { key: `${anneeSuivante}-04`, label: `Avril ${anneeSuivante}` },
  ];
}

// Trouve la dernière période déjà commencée à ce jour — pas une correspondance exacte, car Octobre
// n'a pas de clé propre (fusionné avec Septembre) et ne "matcherait" jamais directement.
export function currentPeriodKey(periods: Period[], now: Date): string {
  const cleActuelle = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (cleActuelle < periods[0].key) return periods[0].key; // avant la rentrée (Mai à Août)

  let resultat = periods[periods.length - 1].key;
  for (const p of periods) {
    if (p.key <= cleActuelle) resultat = p.key;
    else break;
  }
  return resultat;
}

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
