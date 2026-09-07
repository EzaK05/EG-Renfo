import { getDefaultLocalityId } from "./locality.js";
import { prisma } from "./prisma.js";
import { computePeriods, deriveSchoolYearStart } from "../services/periods.js";

// Les fonctions pures de services/periods.ts calculent les périodes de l'année scolaire en mémoire ;
// ce helper garantit qu'une ligne Period existe en base pour chacune (idempotent), pour que les
// paiements/ajustements puissent y référencer un vrai periodId. Appelé au premier accès qui en a besoin
// (config de référence, inscription, paiement...) plutôt qu'une seule fois au démarrage — plus simple
// que gérer un job de démarrage, coût négligeable (upsert sur au plus 7 lignes).
export async function ensureCurrentSchoolYearPeriods() {
  const localityId = await getDefaultLocalityId();
  const locality = await prisma.locality.findUniqueOrThrow({ where: { id: localityId } });
  const schoolYearStart = locality.currentSchoolYearStart ?? deriveSchoolYearStart(new Date());
  const computed = computePeriods(schoolYearStart);

  return Promise.all(
    computed.map((p, i) =>
      prisma.period.upsert({
        where: { localityId_key: { localityId, key: p.key } },
        update: {},
        create: { localityId, key: p.key, label: p.label, schoolYearStartYear: schoolYearStart, sortOrder: i },
      })
    )
  );
}
