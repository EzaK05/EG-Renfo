// Peuple la config de base — équivalent des constantes BASES/NIVEAUX/CATEGORIES_ANCIENNETE/MATIERES
// codées en dur dans Code.gs, mais sous forme de lignes en base (voir Phase 2 du plan).
// Exécution : npm run prisma:seed (après avoir renseigné backend/.env avec les vraies chaînes Neon).
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const locality = await prisma.locality.upsert({
    where: { name: "Yamoussoukro" },
    update: {},
    create: { name: "Yamoussoukro", timezone: "Africa/Abidjan" },
  });

  const zaher = await prisma.base.upsert({
    where: { localityId_name: { localityId: locality.id, name: "Zaher" } },
    update: {},
    create: { localityId: locality.id, name: "Zaher", code: "ZAH" },
  });
  const kokrenou = await prisma.base.upsert({
    where: { localityId_name: { localityId: locality.id, name: "Kokrenou" } },
    update: {},
    create: { localityId: locality.id, name: "Kokrenou", code: "KOK" },
  });

  // NIVEAUX (série, code court pour l'ID, tarif mensuel) — reprend exactement la constante NIVEAUX de Code.gs.
  // isExamClass/mockExamBareme reprennent NIVEAUX_CLASSES_EXAMEN + BAREME_EXAMEN_BLANC (3e et Tle uniquement).
  const niveauxDef = [
    { name: "6e", code: "6", hasSeries: false, series: [] as string[], montantMensuel: 5000, sortOrder: 1, isExamClass: false, mockExamBareme: null as number | null },
    { name: "5e", code: "5", hasSeries: false, series: [], montantMensuel: 5000, sortOrder: 2, isExamClass: false, mockExamBareme: null },
    { name: "4e", code: "4", hasSeries: false, series: [], montantMensuel: 7000, sortOrder: 3, isExamClass: false, mockExamBareme: null },
    { name: "3e", code: "3", hasSeries: false, series: [], montantMensuel: 15000, sortOrder: 4, isExamClass: true, mockExamBareme: 360 },
    { name: "2nde", code: "2", hasSeries: true, series: ["C", "A"], montantMensuel: 10000, sortOrder: 5, isExamClass: false, mockExamBareme: null },
    { name: "1ere", code: "1", hasSeries: true, series: ["A", "C", "D"], montantMensuel: 10000, sortOrder: 6, isExamClass: false, mockExamBareme: null },
    { name: "Tle", code: "T", hasSeries: true, series: ["A", "C", "D"], montantMensuel: 15000, sortOrder: 7, isExamClass: true, mockExamBareme: 400 },
  ];

  const fraisInscriptionStandard = 5000;
  const effectiveFrom = new Date();

  const niveauxParNom: Record<string, { id: string }> = {};
  const seriesParNiveauSerie: Record<string, { id: string }> = {};

  for (const def of niveauxDef) {
    const niveau = await prisma.niveau.upsert({
      where: { localityId_name: { localityId: locality.id, name: def.name } },
      update: {},
      create: {
        localityId: locality.id,
        name: def.name,
        code: def.code,
        hasSeries: def.hasSeries,
        sortOrder: def.sortOrder,
        isExamClass: def.isExamClass,
        mockExamBareme: def.mockExamBareme,
      },
    });
    niveauxParNom[def.name] = niveau;

    await prisma.tariff.create({
      data: {
        niveauId: niveau.id,
        monthlyAmount: def.montantMensuel,
        registrationFee: fraisInscriptionStandard,
        effectiveFrom,
      },
    });

    for (const serieName of def.series) {
      const serie = await prisma.serie.upsert({
        where: { niveauId_name: { niveauId: niveau.id, name: serieName } },
        update: {},
        create: { niveauId: niveau.id, name: serieName },
      });
      seriesParNiveauSerie[`${def.name}:${serieName}`] = serie;
    }
  }

  // BASE_NIVEAU_ALLOWLIST — remplace _baseAutorisePourNiveau().
  // Zaher : tous les niveaux/séries. Kokrenou : seulement 3e, 2nde-C, Tle-D.
  //
  // Note : @@unique([baseId, niveauId, serieId]) ne peut pas servir de clé d'upsert ici — Postgres traite
  // chaque NULL comme distinct dans une contrainte unique, donc Prisma ne permet pas de lookup composite
  // avec `serieId: null`. On passe par un findFirst+create explicite (idempotent) à la place.
  async function upsertAllowlist(baseId: string, niveauId: string, serieId: string | null) {
    const existing = await prisma.baseNiveauAllowlist.findFirst({ where: { baseId, niveauId, serieId } });
    if (!existing) await prisma.baseNiveauAllowlist.create({ data: { baseId, niveauId, serieId } });
  }

  for (const def of niveauxDef) {
    const niveau = niveauxParNom[def.name];
    if (def.series.length === 0) {
      await upsertAllowlist(zaher.id, niveau.id, null);
    } else {
      for (const serieName of def.series) {
        const serie = seriesParNiveauSerie[`${def.name}:${serieName}`];
        await upsertAllowlist(zaher.id, niveau.id, serie.id);
      }
    }
  }
  await upsertAllowlist(kokrenou.id, niveauxParNom["3e"].id, null);
  await upsertAllowlist(kokrenou.id, niveauxParNom["2nde"].id, seriesParNiveauSerie["2nde:C"].id);
  await upsertAllowlist(kokrenou.id, niveauxParNom["Tle"].id, seriesParNiveauSerie["Tle:D"].id);

  // CATEGORIES_ANCIENNETE (paie encadreurs)
  const tiers = [
    { name: "1ère année", ratePerSession: 6000, sortOrder: 1 },
    { name: "2ème année", ratePerSession: 8000, sortOrder: 2 },
    { name: "3ème année et plus", ratePerSession: 9000, sortOrder: 3 },
  ];
  for (const tier of tiers) {
    const existing = await prisma.seniorityTier.findFirst({ where: { localityId: locality.id, name: tier.name } });
    if (!existing) {
      await prisma.seniorityTier.create({
        data: { localityId: locality.id, name: tier.name, ratePerSession: tier.ratePerSession, sortOrder: tier.sortOrder },
      });
    }
  }

  // MATIERES
  const matieresDef = ["Mathématiques", "Physique-Chimie", "Biologie", "Français", "Anglais", "Philosophie", "Histoire-Géo", "Informatique", "Arts", "LV2", "EPS"];
  const matieresParNom: Record<string, { id: string }> = {};
  for (const nom of matieresDef) {
    const matiere = await prisma.matiere.upsert({ where: { name: nom }, update: {}, create: { name: nom } });
    matieresParNom[nom] = matiere;
  }

  // NIVEAU_MATIERE — reprend _matieresPourNiveauEleve() : base commune + Philosophie ajoutée pour 1ere/Tle.
  const matieresBase = ["Mathématiques", "Physique-Chimie", "Biologie", "Français", "Anglais", "Histoire-Géo", "Informatique", "Arts", "LV2", "EPS"];
  const niveauxAvecPhilo = ["1ere", "Tle"];
  for (const def of niveauxDef) {
    const niveau = niveauxParNom[def.name];
    const liste = matieresBase.slice();
    if (niveauxAvecPhilo.includes(def.name)) liste.splice(liste.indexOf("Anglais") + 1, 0, "Philosophie");
    for (let i = 0; i < liste.length; i++) {
      const matiere = matieresParNom[liste[i]];
      await prisma.niveauMatiere.upsert({
        where: { niveauId_matiereId: { niveauId: niveau.id, matiereId: matiere.id } },
        update: {},
        create: { niveauId: niveau.id, matiereId: matiere.id, sortOrder: i },
      });
    }
  }

  // CRENEAUX — reprend exactement la constante CRENEAUX de Code.gs (jour de semaine -> horaires + accès classes d'examen).
  const creneauxDef = [
    { dayOfWeek: 3, label: "Soir", appliesToAllNiveaux: false }, // Mercredi soir : classes d'examen uniquement
    { dayOfWeek: 6, label: "Matin", appliesToAllNiveaux: true }, // Samedi
    { dayOfWeek: 6, label: "Soir", appliesToAllNiveaux: true },
    { dayOfWeek: 0, label: "Soir", appliesToAllNiveaux: true }, // Dimanche
  ];
  for (const def of creneauxDef) {
    const existing = await prisma.scheduleSlot.findFirst({
      where: { localityId: locality.id, dayOfWeek: def.dayOfWeek, label: def.label },
    });
    if (!existing) {
      await prisma.scheduleSlot.create({
        data: { localityId: locality.id, dayOfWeek: def.dayOfWeek, label: def.label, appliesToAllNiveaux: def.appliesToAllNiveaux },
      });
    }
  }

  // SESSION_GROUPS — reprend GROUPES_TLE_D_ZAHER : seule la Tle D de Zaher est répartie sur 3 salles.
  const tleSerieD = seriesParNiveauSerie["Tle:D"];
  for (const label of ["A", "B", "C"]) {
    const existing = await prisma.sessionGroup.findFirst({
      where: { baseId: zaher.id, niveauId: niveauxParNom["Tle"].id, serieId: tleSerieD.id, label },
    });
    if (!existing) {
      await prisma.sessionGroup.create({
        data: { baseId: zaher.id, niveauId: niveauxParNom["Tle"].id, serieId: tleSerieD.id, label },
      });
    }
  }

  // ÉCOLES — reprend la liste figée dans Index.html (autocomplete du formulaire d'inscription).
  const ecoles = [
    "Collège Ange Dominique 1", "Collège Ange Dominique 2", "Collège Aries", "Collège Eden", "Collège Heleis",
    "Collège K. L. Djédri", "Collège Konan 1", "Collège Konan 2", "Collège La Fontaine",
    "Collège Moderne II de Yamoussoukro", "Collège Municipal de Yamoussoukro", "Collège Notre Dame de la Visitation",
    "Collège Notre Dame de Lourdes", "Collège Notre Dame des Lacs 1", "Collège Privé Agbéhy des Jeunes Élites",
    "Collège Privé Amorovi", "Collège Privé Avogadro", "Collège Privé BAKOU", "Collège Privé CALE",
    "Collège Privé Catholique Saint Louis", "Collège Privé Dieudonné", "Collège Privé Gnonhonda",
    "Collège Privé Grâce Trésor", "Collège Privé ISCAE", "Collège Privé Jeunes Filles Athéna", "Collège Privé Kiwi",
    "Collège Privé Mariam Fofana Al Ma-Arifa", "Collège Privé Mocinla", "Collège Privé Notre Dame des Lacs 2",
    "Collège Privé Pédagogue", "Collège Privé Sainte Catherine", "Cours Secondaire Protestant CMA",
    "Lycée Mamie Adjoua", "Lycée Mixte 1", "Lycée Mixte 2", "Lycée Moderne 1", "Lycée Moderne BAD",
    "Lycée Scientifique de Yamoussoukro",
  ];
  for (const nom of ecoles) {
    await prisma.school.upsert({ where: { name: nom }, update: {}, create: { name: nom } });
  }

  // Compte admin de test — change le mot de passe immédiatement après la première connexion.
  const adminPasswordHash = await argon2.hash("change-me-now");
  await prisma.userAccount.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      passwordHash: adminPasswordHash,
      displayName: "Administration",
      role: "ADMIN",
      canSeeStats: true,
      localityId: locality.id,
    },
  });

  console.log("Seed terminé : locality=%s, bases=[Zaher, Kokrenou], niveaux=%d, admin/change-me-now", locality.name, niveauxDef.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
