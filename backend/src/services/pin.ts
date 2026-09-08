import crypto from "node:crypto";

// Port de _genererPin() (Code.gs) — code numérique aléatoire (élèves, encadreurs).
// crypto.randomInt (CSPRNG) plutôt que Math.random() utilisé côté GAS : même usage (PIN affiché à
// l'utilisateur, pas un secret cryptographique en soi), mais sans coût à être plus rigoureux ici.
export function generatePin(length = 4): string {
  let pin = "";
  for (let i = 0; i < length; i++) pin += crypto.randomInt(0, 10).toString();
  return pin;
}
