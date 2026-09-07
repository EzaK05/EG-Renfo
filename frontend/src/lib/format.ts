// Port de formatMoney() (Index.html) — espace insécable comme séparateur de milliers, arrondi au franc.
export function formatMoney(num: number): string {
  const safe = Number.isFinite(num) ? num : 0;
  return Math.round(safe)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " F";
}
