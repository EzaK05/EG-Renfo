import { prisma } from "./prisma.js";

// Une seule localité active pour l'instant (voir plan, Phase 5 : chaque table de config est déjà scopée
// par localityId, prête pour plusieurs localités — mais tant qu'il n'y en a qu'une, pas besoin d'exposer
// un sélecteur de localité dans l'API/le frontend. Ce helper est le seul endroit à changer le jour où il
// faudra résoudre la localité depuis la requête (sous-domaine, en-tête, etc.) plutôt que "la première active".
let cachedLocalityId: string | null = null;

export async function getDefaultLocalityId(): Promise<string> {
  if (cachedLocalityId) return cachedLocalityId;
  const locality = await prisma.locality.findFirst({ where: { active: true }, orderBy: { createdAt: "asc" } });
  if (!locality) throw new Error("Aucune localité configurée — lance `npm run prisma:seed`.");
  cachedLocalityId = locality.id;
  return locality.id;
}
