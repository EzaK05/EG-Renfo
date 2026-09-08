// Port pur de _genererNouvelId() (Code.gs) : trouve le plus grand suffixe numérique parmi les ID
// existants partageant un préfixe donné, et retourne le suivant, zéro-paddé. Utilisé pour les ID
// élèves (ex: "ZAH6001") et encadreurs (ex: "ENC001") — voir services/displayId.ts pour le wrapper DB.
export function nextIdInSequence(existingIds: string[], prefix: string, width = 3): string {
  let maxNum = 0;
  for (const id of existingIds) {
    if (!id.startsWith(prefix)) continue;
    const num = parseInt(id.slice(prefix.length), 10);
    if (!isNaN(num) && num > maxNum) maxNum = num;
  }
  return prefix + String(maxNum + 1).padStart(width, "0");
}
