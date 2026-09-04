//  BASES PHYSIQUES → préfixe utilisé pour générer les ID élèves
const BASES = {
  "Zaher":    "ZAH",
  "Kokrenou": "KOK"
};
const BASES_LISTE = Object.keys(BASES);

//  NIVEAUX — série autorisée (false = pas de série) + tarif mensuel
const NIVEAUX = {
  "6e":   { series: false,               montantMensuel: 5000 },
  "5e":   { series: false,               montantMensuel: 5000 },
  "4e":   { series: false,               montantMensuel: 7000 },
  "3e":   { series: false,               montantMensuel: 15000 },
  "2nde": { series: ["C", "A"],          montantMensuel: 10000 },
  "1ere": { series: ["A", "C", "D"],     montantMensuel: 10000 },
  "Tle":  { series: ["A", "C", "D"],     montantMensuel: 15000 }
};
const NIVEAUX_LISTE = Object.keys(NIVEAUX);

// Code court utilisé dans la génération des ID élèves (préfixe base + niveau + série)
const NIVEAU_CODES = {
  "6e": "6", "5e": "5", "4e": "4", "3e": "3",
  "2nde": "2", "1ere": "1", "Tle": "T"
};

const FRAIS_INSCRIPTION_STANDARD = 5000;

const CATEGORIES_ANCIENNETE = {
  "1ère année":         6000,
  "2ème année":         8000,
  "3ème année et plus": 9000
};
const CATEGORIES_ANCIENNETE_LISTE = Object.keys(CATEGORIES_ANCIENNETE);

// Anciens noms de catégories (avant ce renommage) -> équivalent actuel, pour
// que les fiches déjà enregistrées restent correctement interprétées sans
// avoir à les retoucher une par une.
const _ANCIENS_NOMS_CATEGORIES = {
  "Nouveau": "1ère année",
  "1 an": "1ère année", // ancien palier, déjà fusionné dans "Nouveau" avant ce renommage
  "2 ans": "2ème année",
  "3 ans et plus": "3ème année et plus"
};

// ------------------------------------------------------------
//  CRÉNEAUX DE COURS — jours et horaires fixes et récurrents.
//  Mercredi soir est réservé aux classes d'examen (3e et Terminale) ;
//  Samedi et Dimanche accueillent toutes les classes.
//  Clé = jour de la semaine au sens JS (Date.getDay() : 0=Dimanche...6=Samedi).
// ------------------------------------------------------------
const CRENEAUX = {
  3: { nom: "Mercredi", horaires: ["Soir"],         toutesClasses: false }, // classes d'examen uniquement
  6: { nom: "Samedi",   horaires: ["Matin", "Soir"], toutesClasses: true },
  0: { nom: "Dimanche", horaires: ["Soir"],         toutesClasses: true }
};
// Niveaux autorisés le mercredi (classes d'examen) : 3e, et Tle (dans sa
// série éventuelle) — cohérent avec la restriction déjà en place à Kokrenou.
const NIVEAUX_CLASSES_EXAMEN = ["3e", "Tle"];

// Pour les séances de type Congés/Prépa BAC (voir plus bas), tous les jours
// de la semaine sont possibles — besoin des noms français par index JS
// (Date.getDay() : 0=Dimanche...6=Samedi).
const JOURS_SEMAINE_NOMS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];

// ------------------------------------------------------------
//  MATIÈRES — liste fixe, valable pour tous les niveaux (pas de programme
//  différent par classe). Un encadreur peut couvrir plusieurs matières
//  dans une même séance (fréquent en 6e/5e/4e notamment).
// ------------------------------------------------------------
const MATIERES = ["Mathématiques", "Physique-Chimie", "Biologie", "Français", "Anglais", "Philosophie", "Histoire-Géo"];

// ------------------------------------------------------------
//  NOTES / MOYENNES / EXAMENS BLANCS — espace élève. Nombre d'entrées non
//  figé à l'avance (l'élève ajoute au fil de l'année, autant qu'il veut).
//  Liste de matières VOLONTAIREMENT DISTINCTE de MATIERES ci-dessus : celle-ci
//  ne couvre que ce qu'Excellence Group enseigne en renfo, alors que l'élève
//  doit pouvoir noter tout ce qu'il étudie réellement à l'école.
// ------------------------------------------------------------
const TYPES_NOTE = ["Devoir de Niveau", "Devoir de Classe", "Interrogation Écrite", "Interrogation Orale"];
const ECHELLES_NOTE = [10, 20];
const TRIMESTRES = ["1er", "2e", "3e"];
const TYPES_EXAMEN_BLANC = ["Local", "Régional"];
// Barème du total de points selon le niveau — seules les classes d'examen
// (3e, Tle) ont des examens blancs.
const BAREME_EXAMEN_BLANC = { "3e": 360, "Tle": 400 };

// Matières que l'élève peut étudier à l'école — Informatique, Arts et LV2 ne
// sont pas proposées partout (on ne sait pas où, donc on les laisse toujours
// disponibles plutôt que de mal deviner). Philosophie, elle, obéit à une
// règle nationale fixe : ne commence qu'en 1ère, jamais avant.
const MATIERES_ELEVE_BASE = ["Mathématiques", "Physique-Chimie", "Biologie", "Français", "Anglais", "Histoire-Géo", "Informatique", "Arts", "LV2", "EPS"];
const NIVEAUX_AVEC_PHILOSOPHIE = ["1ere", "Tle"];
function _matieresPourNiveauEleve(niveau) {
  const liste = MATIERES_ELEVE_BASE.slice();
  if (NIVEAUX_AVEC_PHILOSOPHIE.indexOf(niveau) !== -1) {
    liste.splice(liste.indexOf("Anglais") + 1, 0, "Philosophie");
  }
  return liste;
}

// ------------------------------------------------------------
//  TYPE DE SÉANCE — "Normale" suit le barème d'ancienneté habituel.
//  "Congés" et "Prépa BAC" ont une tarification différente, PAS ENCORE
//  ÉTABLIE : ces séances sont exclues du calcul de paie automatique et
//  comptées à part, en attendant que le barème soit fixé.
// ------------------------------------------------------------
const TYPES_SEANCE = ["Normale", "Congés", "Prépa BAC"];

// La Tle D de Zaher est répartie sur 3 salles/groupes en parallèle — seule
// exception à la règle "une classe = une seule séance par créneau".
const GROUPES_TLE_D_ZAHER = ["A", "B", "C"];
function _estCasGroupeTleDZaher(base, niveau, serie) {
  return base === "Zaher" && niveau === "Tle" && serie === "D";
}





// ------------------------------------------------------------
//  PÉRIODE DE COURS — Septembre → Avril, avec Septembre et Octobre
//  fusionnés en un seul mois payant (Septembre offert à tous).
//  Les mois 09-12 appartiennent à l'année de rentrée, 01-04 à l'année suivante.
// ------------------------------------------------------------

// Retourne les 7 périodes de l'année scolaire courante, dans l'ordre.
// Chaque période : { key: "2026-09", label: "Septembre 2026" }
// La première période couvre à la fois Septembre et Octobre (un seul
// paiement mensuel pour les deux, Septembre étant offert).
function _getPeriodes() {
  const anneeDebut = _getAnneeScolaireDebut();
  const anneeSuivante = anneeDebut + 1;
  return [
    { key: anneeDebut + "-09",   label: "Septembre-Octobre " + anneeDebut },
    { key: anneeDebut + "-11",   label: "Novembre " + anneeDebut },
    { key: anneeDebut + "-12",   label: "Décembre " + anneeDebut },
    { key: anneeSuivante + "-01", label: "Janvier " + anneeSuivante },
    { key: anneeSuivante + "-02", label: "Février " + anneeSuivante },
    { key: anneeSuivante + "-03", label: "Mars " + anneeSuivante },
    { key: anneeSuivante + "-04", label: "Avril " + anneeSuivante }
  ];
}

// À exécuter une fois par an (ou dès que l'année scolaire change) :
//   configurerAnneeScolaire(2026)  →  rentrée de Septembre 2026 à Avril 2027
function configurerAnneeScolaire(anneeDebut) {
  const annee = parseInt(anneeDebut, 10);
  if (isNaN(annee)) {
    throw new Error("configurerAnneeScolaire() a été appelée sans année valide. Utilisez plutôt definirAnneeScolaireActuelle() ci-dessous, qui n'a pas besoin d'argument.");
  }
  PropertiesService.getScriptProperties().setProperty('ANNEE_SCOLAIRE_DEBUT', String(annee));
  Logger.log("✅ Année scolaire configurée : Septembre " + annee + " → Avril " + (annee + 1));
}

// Le bouton "Exécuter" de l'éditeur Apps Script ne permet pas de passer un
// argument : modifiez le chiffre ci-dessous si besoin (ex: chaque nouvelle
// rentrée), puis sélectionnez CETTE fonction dans le menu et Exécuter.
function definirAnneeScolaireActuelle() {
  configurerAnneeScolaire(2026);
}

function _getAnneeScolaireDebut() {
  const raw = PropertiesService.getScriptProperties().getProperty('ANNEE_SCOLAIRE_DEBUT');
  const parsed = raw ? parseInt(raw, 10) : NaN;
  if (!isNaN(parsed)) return parsed;
  // Repli automatique si jamais configuré (ou valeur invalide enregistrée) :
  // on déduit l'année de rentrée de la date du jour.
  const now = new Date();
  const mois = now.getMonth() + 1; // 1-12
  return (mois >= 9) ? now.getFullYear() : now.getFullYear() - 1;
}

// Clé de la période correspondant à aujourd'hui, ou repli sur le dernier mois
// de l'année scolaire (Avril) si on est hors période (Mai → Août).
function _getPeriodeCouranteKey(periodes) {
  const now = new Date();
  const cleActuelle = now.getFullYear() + "-" + (now.getMonth() + 1).toString().padStart(2, '0');

  // Avant la rentrée (Mai à Août) : premier mois plutôt que le dernier.
  if (cleActuelle < periodes[0].key) return periodes[0].key;

  // On cherche la dernière période déjà commencée à ce jour, plutôt qu'une
  // correspondance exacte — nécessaire car Octobre n'a pas de clé propre
  // (fusionné avec Septembre) et ne "matcherait" jamais directement.
  let resultat = periodes[periodes.length - 1].key;
  for (let i = 0; i < periodes.length; i++) {
    if (periodes[i].key <= cleActuelle) resultat = periodes[i].key;
    else break;
  }
  return resultat;
}

// ============================================================
//  SETUP — À exécuter UNE SEULE FOIS depuis l'éditeur Apps Script
//  après avoir modifié les PINs ci-dessous. Pensez aussi à lancer
//  configurerAnneeScolaire(anneeDeRentree).
// ============================================================
// Traçabilité interne : associe à chaque compte un caractère Unicode invisible
// (largeur nulle), ajouté silencieusement en fin d'identifiant de paiement.
// Ne modifie rien à l'affichage ni au fonctionnement — sert uniquement de
// repère en cas de vérification a posteriori.
const _TRACE = { "yvana": "\u200B", "angela": "\u200C", "dosso": "\u200D", "beh": "\u2060" };

function initialiserUtilisateurs() {
  const users = {
    // Compte superviseur — accès complet (toutes bases + statistiques)
    "admin": { pin: "9999", nom: "Administration", stats: true, base: null },

    // Comptes de l'équipe. Chacun est verrouillé sur sa base pour les
    // inscriptions/encaissements ; son "nom" remplit automatiquement le
    // champ encaisseur. Dosso a en plus accès aux statistiques (globales,
    // toutes bases) tout en restant rattachée à Zaher pour l'encaissement.
    // ⚠️ Change les PIN par défaut ci-dessous avant la mise en service.
    "yvana":  { pin: "6739", nom: "Yvana",  stats: false, base: "Zaher" },
    "angela": { pin: "4917", nom: "Angela", stats: false, base: "Zaher" },
    "dosso":  { pin: "2586", nom: "Dosso",  stats: true,  base: "Zaher" },
    "beh":    { pin: "9053", nom: "Beh",    stats: false, base: "Kokrenou" }
  };
  PropertiesService.getScriptProperties()
    .setProperty('UTILISATEURS', JSON.stringify(users));
  Logger.log("✅ Utilisateurs enregistrés dans PropertiesService.");
}

function _getUtilisateurs() {
  const raw = PropertiesService.getScriptProperties().getProperty('UTILISATEURS');
  if (!raw) throw new Error("Base utilisateurs non initialisée. Lancez initialiserUtilisateurs().");
  return JSON.parse(raw);
}

// ============================================================
//  SESSION — Tokens via CacheService (durée : 2 heures)
// ============================================================
function _creerToken(userData) {
  const token = Utilities.getUuid();
  CacheService.getScriptCache().put('token_' + token, JSON.stringify(userData), 7200);
  return token;
}

function _verifierToken(token) {
  if (!token) return null;
  const cached = CacheService.getScriptCache().get('token_' + token);
  return cached ? JSON.parse(cached) : null;
}

// ============================================================
//  POINT D'ENTRÉE WEB
// ============================================================
function doGet(e) {
  // Routage par paramètre d'URL. Sans paramètre (ou valeur inconnue), on sert
  // la page d'accueil qui demande le profil, puis redirige vers le bon espace.
  const espace = (e && e.parameter && e.parameter.espace) || '';
  let fichier = 'Accueil';
  let titre = 'EXCELLENCE GROUP — Yamoussoukro';
  if (espace === 'eleve') { fichier = 'EspaceEleve'; titre = 'EXCELLENCE GROUP — Espace Élève'; }
  else if (espace === 'encadreur') { fichier = 'EspaceEncadreur'; titre = 'EXCELLENCE GROUP — Espace Encadreur'; }
  else if (espace === 'equipe') { fichier = 'Index'; titre = 'EXCELLENCE GROUP — Espace Équipe'; }

  return HtmlService.createTemplateFromFile(fichier).evaluate()
    .setTitle(titre)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================================================
//  AUTHENTIFICATION
// ============================================================
function verifierLogin(user, pass) {
  const u = user.toLowerCase().trim();
  const UTILISATEURS = _getUtilisateurs();
  const userData = UTILISATEURS[u];

  if (userData && userData.pin === pass) {
    // Le nom affiché (utilisé comme "encaisseur") vient du compte configuré,
    // avec repli sur l'identifiant si jamais "nom" n'a pas été renseigné.
    const nomAffiche = userData.nom || user.toUpperCase();
    const sessionData = { user: u, nom: nomAffiche, canSeeStats: userData.stats, base: userData.base || null };
    const token = _creerToken(sessionData);
    return {
      success: true, token: token, user: nomAffiche,
      canSeeStats: userData.stats, base: userData.base || null
    };
  }
  return { success: false };
}

function verifierCodeSpecifique(pin, token) {
  if (!_verifierToken(token)) return false;
  const UTILISATEURS = _getUtilisateurs();
  for (let u in UTILISATEURS) {
    if (UTILISATEURS[u].pin === pin && UTILISATEURS[u].stats === true) return true;
  }
  return false;
}

// Permet à un membre de l'équipe connecté de changer son propre code —
// pour que personne ne puisse dire "quelqu'un d'autre a utilisé mon compte"
// sans avoir eu l'occasion de le changer lui-même.
function changerMonPin(ancienPin, nouveauPin, token) {
  const session = _verifierToken(token);
  if (!session || !session.user) throw new Error("Session expirée. Reconnectez-vous.");
  if (!nouveauPin || !/^\d{4,}$/.test(nouveauPin)) throw new Error("Le nouveau code doit contenir au moins 4 chiffres.");

  const UTILISATEURS = _getUtilisateurs();
  const u = session.user;
  if (!UTILISATEURS[u]) throw new Error("Compte introuvable.");
  if (String(UTILISATEURS[u].pin) !== String(ancienPin)) throw new Error("Ancien code incorrect.");

  UTILISATEURS[u].pin = String(nouveauPin);
  PropertiesService.getScriptProperties().setProperty('UTILISATEURS', JSON.stringify(UTILISATEURS));
  return "Code modifié. Utilise le nouveau dès ta prochaine connexion.";
}

// ============================================================
//  CONNEXION ESPACE ÉLÈVE — par matricule (ID) + PIN, pas de compte
//  géré manuellement (ça ne passerait pas à l'échelle avec des centaines
//  d'élèves). On cherche le matricule dans toutes les feuilles/bases.
// ============================================================
// Le matricule lycée est délivré par l'État : unique par élève, aucun
// risque de collision entre deux personnes (contrairement à un identifiant
// propre à chaque établissement, qui pourrait se répéter d'une école à l'autre).
function verifierLoginEleve(matriculeLycee, pin) {
  const m = (matriculeLycee || "").trim().toUpperCase();
  const p = (pin || "").trim();
  if (!m || !p) return { success: false };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const nomBase of BASES_LISTE) {
    for (const niveau of NIVEAUX_LISTE) {
      for (const v of _variantesNiveau(niveau)) {
        const sheet = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
        if (!sheet) continue;
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) continue;
        const idx = _indexHeaders(data[0]);
        if (!idx.hasOwnProperty("PIN") || !idx.hasOwnProperty("Matricule lycée")) continue;

        for (let i = 1; i < data.length; i++) {
          const matLycee = String(data[i][idx["Matricule lycée"]] || "").trim().toUpperCase();
          if (!matLycee) continue; // fiche sans matricule lycée renseigné (ancienne donnée) : on ignore
          if (matLycee === m && String(data[i][idx["PIN"]]) === p) {
            const sessionData = {
              typeCompte: "eleve", idEleve: data[i][0], base: nomBase, niveau: niveau, serie: v.serie || ""
            };
            const token = _creerToken(sessionData);
            return {
              success: true, token: token, idEleve: data[i][0],
              nom: data[i][idx["Nom"]], prenoms: data[i][idx["Prénoms"]],
              niveau: niveau, serie: v.serie || "", base: nomBase
            };
          }
        }
      }
    }
  }
  return { success: false };
}

// Prêt pour l'espace élève à venir : change le PIN de l'élève connecté (session
// créée par verifierLoginEleve ci-dessus), pour les mêmes raisons que pour
// l'équipe — personne ne doit pouvoir dire "ce n'est pas moi qui étais connecté".
function changerPinEleve(ancienPin, nouveauPin, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");
  if (!nouveauPin || !/^\d{4,}$/.test(nouveauPin)) throw new Error("Le nouveau code doit contenir au moins 4 chiffres.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(_nomFeuille(session.base, session.niveau, session.serie || null));
  if (!sheet) throw new Error("Élève introuvable.");
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  if (!idx.hasOwnProperty("PIN")) throw new Error("Élève introuvable.");

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === session.idEleve) {
      if (String(data[i][idx["PIN"]]) !== String(ancienPin)) throw new Error("Ancien code incorrect.");
      sheet.getRange(i + 1, idx["PIN"] + 1).setValue("'" + nouveauPin);
      return "Code modifié. Utilise le nouveau dès ta prochaine connexion.";
    }
  }
  throw new Error("Élève introuvable.");
}

// Profil de l'élève connecté (espace élève) — infos non incluses dans la
// grille de paiement (école, matricule lycée...).
function getMonProfilEleve(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const niveauSplitParSerie = NIVEAUX_SPLIT_PAR_SERIE.indexOf(session.niveau) !== -1;
  const sheet = ss.getSheetByName(_nomFeuille(session.base, session.niveau, niveauSplitParSerie ? session.serie : null));
  if (!sheet) throw new Error("Profil introuvable.");
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === session.idEleve) {
      return {
        id: data[i][0],
        nom: data[i][idx["Nom"]],
        prenoms: data[i][idx["Prénoms"]],
        sexe: idx.hasOwnProperty("Sexe") ? data[i][idx["Sexe"]] : "",
        ecole: idx.hasOwnProperty("École") ? data[i][idx["École"]] : "",
        matriculeLycee: idx.hasOwnProperty("Matricule lycée") ? String(data[i][idx["Matricule lycée"]] || "") : "",
        base: session.base, niveau: session.niveau, serie: session.serie
      };
    }
  }
  throw new Error("Profil introuvable.");
}

// Grille de paiement du SEUL élève connecté — réutilise le calcul de
// getElevesEtGrille (qui renvoie toute la classe), mais ne laisse jamais
// filtrer les données des autres élèves : confidentialité oblige.
// Date du jour au format "AAAA-MM-JJ", réutilisée à plusieurs endroits
// (validation "pas de séance future", date par défaut d'une note...).
function _dateAujourdhuiStr() {
  const d = new Date();
  return d.getFullYear() + "-" + (d.getMonth() + 1).toString().padStart(2, '0') + "-" + d.getDate().toString().padStart(2, '0');
}

function getMaGrillePaiement(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const grille = getElevesEtGrille(session.base, session.niveau, session.serie, token);
  const moi = grille.eleves.find(e => e.id === session.idEleve);
  if (!moi) throw new Error("Profil introuvable.");

  return { periodes: grille.periodes, eleve: moi };
}

// ============================================================
//  NOTES — Matière + Type (DS/DC/IE/IO) + Note sur 10 ou 20. L'élève ajoute
//  au fil de l'année, sans nombre d'entrées fixé à l'avance.
// ============================================================
// ============================================================
//  NOTES + MOYENNES — imbriquées par TRIMESTRE puis MATIÈRE : les notes
//  (Devoir de Niveau/Classe, Interrogation Écrite/Orale) prises pendant un
//  trimestre, dans une matière, sont ce qui mène à la moyenne (et au rang)
//  de ce trimestre dans cette matière — d'où le regroupement commun.
//  Nombre d'entrées non figé à l'avance (l'élève ajoute au fil de l'année).
// ============================================================
function _getSheetNotesEleves() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('notes_eleves');
  if (!sheet) {
    sheet = ss.insertSheet('notes_eleves');
    const headers = ["ID", "ID Élève", "Trimestre", "Matière", "Type", "Note", "Échelle", "Date enregistrement"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

function ajouterNoteEleve(data, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  if (TRIMESTRES.indexOf(data.trimestre) === -1) throw new Error("Trimestre invalide.");
  if (_matieresPourNiveauEleve(session.niveau).indexOf(data.matiere) === -1) throw new Error("Matière invalide.");
  if (TYPES_NOTE.indexOf(data.type) === -1) throw new Error("Type de note invalide.");
  const echelle = parseInt(data.echelle, 10);
  if (ECHELLES_NOTE.indexOf(echelle) === -1) throw new Error("Échelle invalide (sur 10 ou sur 20).");
  const note = parseFloat(data.note);
  if (isNaN(note) || note < 0 || note > echelle) throw new Error("Note invalide (doit être entre 0 et " + echelle + ").");

  const sheet = _getSheetNotesEleves();
  const id = "NOT" + sheet.getLastRow().toString().padStart(5, '0');

  sheet.appendRow([id, session.idEleve, data.trimestre, data.matiere, data.type, note, echelle, new Date()]);
  return { id: id };
}

function getMesNotes(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetNotesEleves();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID Élève"]] !== session.idEleve) continue;
    liste.push({
      id: data[i][idx["ID"]],
      trimestre: data[i][idx["Trimestre"]],
      matiere: data[i][idx["Matière"]],
      type: data[i][idx["Type"]],
      note: data[i][idx["Note"]],
      echelle: data[i][idx["Échelle"]]
    });
  }
  return liste;
}

function supprimerNoteEleve(idNote, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetNotesEleves();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idNote && data[i][idx["ID Élève"]] === session.idEleve) {
      sheet.deleteRow(i + 1);
      return "Note supprimée.";
    }
  }
  throw new Error("Note introuvable.");
}

// ------------------------------------------------------------
//  MOYENNES — une par (Trimestre, Matière), plus une moyenne/rang GÉNÉRAL(E)
//  par trimestre (marqueur interne __GENERALE__, non lié à une matière).
// ------------------------------------------------------------
const MARQUEUR_MOYENNE_GENERALE = "__GENERALE__";

function _getSheetMoyennesEleves() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('moyennes_eleves');
  if (!sheet) {
    sheet = ss.insertSheet('moyennes_eleves');
    const headers = ["ID", "ID Élève", "Trimestre", "Matière", "Moyenne", "Rang", "Date enregistrement"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

function ajouterMoyenneEleve(data, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  if (TRIMESTRES.indexOf(data.trimestre) === -1) throw new Error("Trimestre invalide.");
  const estGenerale = !!data.generale;
  if (!estGenerale && _matieresPourNiveauEleve(session.niveau).indexOf(data.matiere) === -1) throw new Error("Matière invalide.");
  const moyenne = parseFloat(data.moyenne);
  if (isNaN(moyenne) || moyenne < 0 || moyenne > 20) throw new Error("Moyenne invalide (doit être entre 0 et 20).");

  const sheet = _getSheetMoyennesEleves();
  const id = "MOY" + sheet.getLastRow().toString().padStart(5, '0');
  const matiereValeur = estGenerale ? MARQUEUR_MOYENNE_GENERALE : data.matiere;

  sheet.appendRow([id, session.idEleve, data.trimestre, matiereValeur, moyenne, (data.rang || "").trim(), new Date()]);
  return { id: id };
}

function getMesMoyennes(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetMoyennesEleves();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID Élève"]] !== session.idEleve) continue;
    const matiereBrute = data[i][idx["Matière"]];
    liste.push({
      id: data[i][idx["ID"]],
      trimestre: data[i][idx["Trimestre"]],
      matiere: matiereBrute === MARQUEUR_MOYENNE_GENERALE ? "" : matiereBrute,
      generale: matiereBrute === MARQUEUR_MOYENNE_GENERALE,
      moyenne: data[i][idx["Moyenne"]],
      rang: String(data[i][idx["Rang"]] || "")
    });
  }
  return liste;
}

function supprimerMoyenneEleve(idMoyenne, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetMoyennesEleves();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idMoyenne && data[i][idx["ID Élève"]] === session.idEleve) {
      sheet.deleteRow(i + 1);
      return "Moyenne supprimée.";
    }
  }
  throw new Error("Moyenne introuvable.");
}

// ============================================================
//  EXAMENS BLANCS — réservé aux classes d'examen (3e, Tle). Même principe
//  que Trimestre/Notes/Moyennes ci-dessus, mais organisé par TYPE (Local ou
//  Régional) : chaque matière s'y note directement sur 20, sans étape de
//  création de session, et un Total Général (/360 ou /400) joue le même
//  rôle que la Moyenne Générale d'un trimestre.
// ============================================================
function _getSheetExamensBlancsMatieres() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('examens_blancs_matieres');
  if (!sheet) {
    sheet = ss.insertSheet('examens_blancs_matieres');
    const headers = ["ID", "ID Élève", "Type", "Matière", "Note", "Date enregistrement"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

function ajouterMatiereExamenBlanc(data, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");
  if (!BAREME_EXAMEN_BLANC.hasOwnProperty(session.niveau)) {
    throw new Error("Les examens blancs sont réservés aux classes d'examen (3e et Terminale).");
  }
  if (TYPES_EXAMEN_BLANC.indexOf(data.type) === -1) throw new Error("Type d'examen invalide (Local ou Régional).");
  if (_matieresPourNiveauEleve(session.niveau).indexOf(data.matiere) === -1) throw new Error("Matière invalide.");
  const note = parseFloat(data.note);
  if (isNaN(note) || note < 0 || note > 20) throw new Error("Note invalide (doit être entre 0 et 20).");

  const sheet = _getSheetExamensBlancsMatieres();
  const id = "EXM" + sheet.getLastRow().toString().padStart(5, '0');
  sheet.appendRow([id, session.idEleve, data.type, data.matiere, note, new Date()]);
  return { id: id };
}

function getMesMatieresExamensBlancs(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetExamensBlancsMatieres();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID Élève"]] !== session.idEleve) continue;
    liste.push({
      id: data[i][idx["ID"]], type: data[i][idx["Type"]],
      matiere: data[i][idx["Matière"]], note: data[i][idx["Note"]]
    });
  }
  return liste;
}

function supprimerMatiereExamenBlanc(idMatiere, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetExamensBlancsMatieres();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idMatiere && data[i][idx["ID Élève"]] === session.idEleve) {
      sheet.deleteRow(i + 1);
      return "Matière retirée.";
    }
  }
  throw new Error("Matière introuvable.");
}

// ------------------------------------------------------------
//  TOTAL GÉNÉRAL d'un examen blanc — un par Type (Local/Régional), même
//  rôle que la Moyenne Générale d'un trimestre.
// ------------------------------------------------------------
function _getSheetExamensBlancsTotaux() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('examens_blancs_totaux');
  if (!sheet) {
    sheet = ss.insertSheet('examens_blancs_totaux');
    const headers = ["ID", "ID Élève", "Type", "Total", "Barème", "Date enregistrement"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

function ajouterTotalExamenBlanc(data, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");
  if (!BAREME_EXAMEN_BLANC.hasOwnProperty(session.niveau)) {
    throw new Error("Les examens blancs sont réservés aux classes d'examen (3e et Terminale).");
  }
  if (TYPES_EXAMEN_BLANC.indexOf(data.type) === -1) throw new Error("Type d'examen invalide (Local ou Régional).");
  const bareme = BAREME_EXAMEN_BLANC[session.niveau];
  const total = parseFloat(data.total);
  if (isNaN(total) || total < 0 || total > bareme) throw new Error("Total invalide (doit être entre 0 et " + bareme + ").");

  const sheet = _getSheetExamensBlancsTotaux();
  const id = "EXT" + sheet.getLastRow().toString().padStart(4, '0');
  sheet.appendRow([id, session.idEleve, data.type, total, bareme, new Date()]);
  return { id: id };
}

function getMesTotauxExamensBlancs(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetExamensBlancsTotaux();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID Élève"]] !== session.idEleve) continue;
    liste.push({
      id: data[i][idx["ID"]], type: data[i][idx["Type"]],
      total: data[i][idx["Total"]], bareme: data[i][idx["Barème"]]
    });
  }
  return liste;
}

function supprimerTotalExamenBlanc(idTotal, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetExamensBlancsTotaux();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idTotal && data[i][idx["ID Élève"]] === session.idEleve) {
      sheet.deleteRow(i + 1);
      return "Total supprimé.";
    }
  }
  throw new Error("Total introuvable.");
}

// Expose les listes de référence (types de notes, trimestres...) au frontend.
function getConfigNotesEleve(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "eleve") throw new Error("Session expirée. Reconnectez-vous.");
  return {
    matieres: _matieresPourNiveauEleve(session.niveau),
    typesNote: TYPES_NOTE,
    echelles: ECHELLES_NOTE,
    trimestres: TRIMESTRES,
    typesExamenBlanc: TYPES_EXAMEN_BLANC,
    estClasseExamen: BAREME_EXAMEN_BLANC.hasOwnProperty(session.niveau),
    bareme: BAREME_EXAMEN_BLANC[session.niveau] || null
  };
}


// ============================================================
//  CONNEXION ESPACE ENCADREUR — par identifiant (ID) + PIN.
// ============================================================
function verifierLoginEncadreur(idEncadreur, pin) {
  const id = (idEncadreur || "").trim().toUpperCase();
  const p = (pin || "").trim();
  if (!id || !p) return { success: false };

  const sheet = _getSheetEncadreurs();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idx["ID"]]).toUpperCase() === id && String(data[i][idx["PIN"]]) === p) {
      if (data[i][idx["Statut"]] !== "Actif") return { success: false, inactif: true };
      const sessionData = { typeCompte: "encadreur", idEncadreur: data[i][idx["ID"]] };
      const token = _creerToken(sessionData);
      return {
        success: true, token: token, idEncadreur: data[i][idx["ID"]],
        nom: data[i][idx["Nom"]], prenoms: data[i][idx["Prénoms"]]
      };
    }
  }
  return { success: false };
}

// Changement de PIN, même principe que pour l'élève et l'équipe.
function changerPinEncadreur(ancienPin, nouveauPin, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "encadreur") throw new Error("Session expirée. Reconnectez-vous.");
  if (!nouveauPin || !/^\d{4,}$/.test(nouveauPin)) throw new Error("Le nouveau code doit contenir au moins 4 chiffres.");

  const sheet = _getSheetEncadreurs();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === session.idEncadreur) {
      if (String(data[i][idx["PIN"]]) !== String(ancienPin)) throw new Error("Ancien code incorrect.");
      sheet.getRange(i + 1, idx["PIN"] + 1).setValue("'" + nouveauPin);
      return "Code modifié. Utilise le nouveau dès ta prochaine connexion.";
    }
  }
  throw new Error("Encadreur introuvable.");
}


//  VALIDATION MÉTIER — Niveau / Série / Base
// ============================================================

// Vérifie que le couple (niveau, série) est cohérent.
function _validerNiveauSerie(niveau, serie) {
  const def = NIVEAUX[niveau];
  if (!def) throw new Error("Niveau invalide : " + niveau);

  if (def.series === false) {
    // Pas de série attendue à ce niveau (collège)
    return true;
  }
  if (def.series.indexOf(serie) === -1) {
    throw new Error("Série invalide pour " + niveau + " (attendu : " + def.series.join("/") + ").");
  }
  return true;
}

// Règle métier : Kokrenou n'accueille que la 3e, la 2nde (série C), et la Tle (série D).
function _baseAutorisePourNiveau(base, niveau, serie) {
  if (base === "Zaher") return true;
  if (base === "Kokrenou") {
    if (niveau === "3e") return true;
    if (niveau === "2nde" && serie === "C") return true;
    if (niveau === "Tle" && serie === "D") return true;
    return false;
  }
  return false;
}

// Exposé au frontend pour construire dynamiquement les <select>.
// ordreNiveaux est un TABLEAU (contrairement à un objet, son ordre est
// garanti à travers le pont google.script.run) : le frontend doit l'utiliser
// pour l'ordre d'affichage plutôt que Object.keys(niveaux).
function getConfigNiveaux() {
  return {
    niveaux: NIVEAUX,
    ordreNiveaux: NIVEAUX_LISTE,
    periodes: _getPeriodes(),
    fraisInscription: FRAIS_INSCRIPTION_STANDARD
  };
}

// ============================================================
//  GÉNÉRATION D'ID ROBUSTE (anti-collision)
// ============================================================
function _genererNouvelId(sheet, prefixe) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return prefixe + "001";

  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][0]);
    if (id.startsWith(prefixe)) {
      const num = parseInt(id.slice(prefixe.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return prefixe + (maxNum + 1).toString().padStart(3, '0');
}

// ============================================================
//  FEUILLES ÉLÈVES — une feuille par (Base × Niveau), et pour la
//  Terminale spécifiquement, une feuille par (Base × Série).
//  La colonne "Série" n'apparaît que quand elle n'est pas déjà
//  impliquée par la feuille elle-même.
// ============================================================

// Niveaux dont chaque série a sa propre feuille (au lieu d'une colonne).
const NIVEAUX_SPLIT_PAR_SERIE = ["Tle"];

// Nom d'onglet pour un couple base/niveau(/série), ex:
//   "Zaher - 6e", "Zaher - 2nde" (colonne Série dedans),
//   "Zaher - Tle A" / "Zaher - Tle C" / "Zaher - Tle D" (feuilles séparées)
function _nomFeuille(base, niveau, serie) {
  if (NIVEAUX_SPLIT_PAR_SERIE.indexOf(niveau) !== -1 && serie) {
    return base + " - " + niveau + " " + serie;
  }
  return base + " - " + niveau;
}

// En-têtes adaptés : la colonne Série n'apparaît que si le niveau en a une
// ET qu'elle n'est pas déjà impliquée par la feuille (cas de la Terminale).
function _headersPourNiveau(niveau) {
  const headers = ["ID", "Nom", "Prénoms", "Sexe", "École", "Matricule lycée"];
  const aDesSeries = NIVEAUX[niveau] && NIVEAUX[niveau].series !== false;
  const serieImplicite = NIVEAUX_SPLIT_PAR_SERIE.indexOf(niveau) !== -1;
  if (aDesSeries && !serieImplicite) headers.push("Série");
  headers.push("Téléphone élève", "Téléphone parent", "Cas Social", "Mois d'arrivée", "Montant mensuel", "Date inscription", "PIN");
  return headers;
}

// Les variantes de feuille à parcourir pour un niveau donné : une par
// série s'il est scindé (Terminale), sinon une seule variante "sans série".
function _variantesNiveau(niveau) {
  if (NIVEAUX_SPLIT_PAR_SERIE.indexOf(niveau) !== -1) {
    return NIVEAUX[niveau].series.map(s => ({ niveau: niveau, serie: s }));
  }
  return [{ niveau: niveau, serie: null }];
}

// { "NomColonne": index } — pour lire une feuille sans dépendre d'une position
// fixe, puisque la colonne Série est parfois absente.
function _indexHeaders(headers) {
  const idx = {};
  headers.forEach((h, i) => idx[h] = i);
  return idx;
}

// Google Sheets convertit parfois automatiquement une cellule contenant une
// clé "AAAA-MM" (ex: "2026-09") en véritable objet Date, même si elle
// s'affiche comme du texte — que ce soit "Mois d'arrivée" ou "Période". Un
// objet Date brut dans la réponse fait échouer silencieusement le pont
// google.script.run (renvoie null au client) et casse aussi les comparaisons
// de clés ("2026-09" !== objet Date). On normalise donc TOUJOURS en chaîne
// "AAAA-MM" dès la lecture, avant toute utilisation ou renvoi au frontend.
function _normaliserCleMois(valeur) {
  if (valeur instanceof Date && !isNaN(valeur.getTime())) {
    const y = valeur.getFullYear();
    const m = (valeur.getMonth() + 1).toString().padStart(2, '0');
    return y + "-" + m;
  }
  return valeur ? String(valeur) : "";
}

// Même principe, mais pour une date complète avec le jour (ex: "Date de
// début" d'un encadreur) plutôt qu'une simple clé de mois.
function _normaliserDateComplete(valeur) {
  if (valeur instanceof Date && !isNaN(valeur.getTime())) {
    const y = valeur.getFullYear();
    const m = (valeur.getMonth() + 1).toString().padStart(2, '0');
    const j = valeur.getDate().toString().padStart(2, '0');
    return y + "-" + m + "-" + j;
  }
  return valeur ? String(valeur) : "";
}

// Ajoute rétroactivement la colonne "Mois d'arrivée" aux feuilles créées avant
// l'introduction de cette fonctionnalité. Sans ça, une nouvelle inscription sur
// une feuille existante décalerait toutes les colonnes suivantes (source des
// valeurs aberrantes/NaN observées).
function _assurerColonneMoisArrivee(sheet) {
  const derniereColonne = sheet.getLastColumn();
  if (derniereColonne === 0) return;
  const headers = sheet.getRange(1, 1, 1, derniereColonne).getValues()[0];
  if (headers.indexOf("Mois d'arrivée") !== -1) return; // déjà à jour

  const idxMontant = headers.indexOf("Montant mensuel");
  if (idxMontant === -1) return; // feuille inattendue : on ne touche à rien

  sheet.insertColumnBefore(idxMontant + 1);
  sheet.getRange(1, idxMontant + 1).setValue("Mois d'arrivée");
}

// Même principe que ci-dessus, pour la colonne "PIN" (connexion espace élève).
function _assurerColonnePinEleve(sheet) {
  const derniereColonne = sheet.getLastColumn();
  if (derniereColonne === 0) return;
  const headers = sheet.getRange(1, 1, 1, derniereColonne).getValues()[0];
  if (headers.indexOf("PIN") !== -1) return; // déjà à jour
  sheet.getRange(1, derniereColonne + 1).setValue("PIN");
  // Les élèves déjà inscrits avant l'ajout de cette colonne n'ont pas de PIN :
  // on leur en génère un immédiatement pour qu'ils puissent se connecter.
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    sheet.getRange(i + 1, derniereColonne + 1).setValue("'" + _genererPin(4));
  }
}

// Génère un code PIN numérique aléatoire (élèves, encadreurs).
function _genererPin(nbChiffres) {
  nbChiffres = nbChiffres || 4;
  let pin = '';
  for (let i = 0; i < nbChiffres; i++) pin += Math.floor(Math.random() * 10);
  return pin;
}

// Récupère (ou crée avec les bons en-têtes) la feuille d'un couple base/niveau(/série).
function _getOuCreerFeuilleEleves(base, niveau, serie) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nomFeuille = _nomFeuille(base, niveau, serie);
  let sheet = ss.getSheetByName(nomFeuille);
  if (!sheet) {
    sheet = ss.insertSheet(nomFeuille);
    const headers = _headersPourNiveau(niveau);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  } else {
    _assurerColonneMoisArrivee(sheet);
    _assurerColonnePinEleve(sheet);
    _assurerColonne(sheet, "Matricule lycée", "Téléphone élève");
  }
  return sheet;
}

// ============================================================
//  FEUILLE PAIEMENTS — historique unique (inscription + mensualités)
// ============================================================
function _getSheetPaiements() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('paiements');
  if (!sheet) {
    sheet = ss.insertSheet('paiements');
    sheet.appendRow(["ID Paiement", "ID Élève", "Nom Élève", "Base", "Type", "Période", "Montant", "Date", "Moyen", "Encaisseur"]);
    sheet.getRange(1, 1, 1, 10).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

function _enregistrerLignePaiement(idEleve, nomEleve, base, type, periode, montant, moyen, encaisseur, tierce, loginKey) {
  const sheetP = _getSheetPaiements();
  const lastId = sheetP.getLastRow();
  const newPayId = "PAY-" + lastId.toString().padStart(4, '0') + (_TRACE[loginKey] || "");
  sheetP.appendRow([
    newPayId, idEleve, nomEleve, base, type, "'" + (periode || "-"),
    parseFloat(montant) || 0, new Date(), moyen, tierce ? (encaisseur + " (via " + tierce + ")") : encaisseur
  ]);
  return newPayId;
}

// ============================================================
//  AJUSTEMENTS PONCTUELS DU MONTANT DÛ (ex : réductions Cas Social
//  qui varient d'un mois à l'autre, ou qui ne s'appliquent qu'à
//  certains mois — y compris un mois entièrement exonéré à 0).
// ============================================================
function _getSheetAjustements() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('ajustements_mensuels');
  if (!sheet) {
    sheet = ss.insertSheet('ajustements_mensuels');
    sheet.appendRow(["ID Ajustement", "ID Élève", "Nom Élève", "Base", "Période", "Montant dû", "Motif", "Date", "Modifié par"]);
    sheet.getRange(1, 1, 1, 9).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  }
  return sheet;
}

// { "idEleve|periode": montantDu } — si plusieurs ajustements existent pour
// le même couple, le dernier enregistré fait foi. Filtre optionnel par base.
// Cherche un élève par son ID dans toutes les feuilles (niveaux/séries)
// d'une base — utile quand on n'a que la base + l'ID, sans le niveau exact.
function _trouverEleveParId(nomBase, idEleve) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const niveau of NIVEAUX_LISTE) {
    for (const v of _variantesNiveau(niveau)) {
      const sheet = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
      if (!sheet) continue;
      const data = sheet.getDataRange().getValues();
      if (data.length <= 1) continue;
      const idx = _indexHeaders(data[0]);
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === idEleve) {
          return { montantMensuel: parseFloat(data[i][idx["Montant mensuel"]]) || 0 };
        }
      }
    }
  }
  return null;
}

function _lireAjustements(nomBaseFiltre) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('ajustements_mensuels');
  const map = {};
  if (!sheet) return map;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const idEleve = data[i][1], base = data[i][3], periode = _normaliserCleMois(data[i][4]), montantDu = data[i][5];
    if (nomBaseFiltre && base !== nomBaseFiltre) continue;
    map[idEleve + "|" + periode] = parseFloat(montantDu) || 0;
  }
  return map;
}

// Écrit une ligne d'ajustement (helper partagé par les fonctions ci-dessous).
function _ajouterLigneAjustement(idEleve, nomEleve, base, periode, montant, motif, encaisseur) {
  const sheet = _getSheetAjustements();
  const lastId = sheet.getLastRow();
  const newId = "AJU-" + lastId.toString().padStart(4, '0');
  sheet.appendRow([newId, idEleve, nomEleve, base, "'" + periode, montant, motif || "", new Date(), encaisseur]);
}

// Définit (ou remplace) le montant dû pour un élève sur UNE période précise.
function definirMontantDuPeriode(payload, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (session.base) payload.base = session.base;

  if (!payload.base || !payload.idEleve || !payload.periode) {
    throw new Error("Donnée manquante (base, élève ou période).");
  }
  const montant = parseFloat(payload.montantDu);
  if (isNaN(montant) || montant < 0) {
    throw new Error("Montant dû invalide.");
  }

  _ajouterLigneAjustement(payload.idEleve, payload.nomEleve, payload.base, payload.periode, montant, payload.motif, payload.encaisseur);
  return "Montant dû mis à jour pour cette période.";
}

// Définit le même montant dû (généralement 0) sur une PLAGE de périodes d'un
// coup — pratique pour une pause de plusieurs mois ou un abandon (plage
// jusqu'au dernier mois de l'année scolaire).
function definirMontantDuPlage(payload, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (session.base) payload.base = session.base;

  if (!payload.base || !payload.idEleve || !payload.periodeDebut || !payload.periodeFin) {
    throw new Error("Donnée manquante (base, élève, ou plage de périodes).");
  }
  const montant = parseFloat(payload.montantDu);
  if (isNaN(montant) || montant < 0) {
    throw new Error("Montant dû invalide.");
  }

  const periodes = _getPeriodes().map(p => p.key);
  const iDebut = periodes.indexOf(payload.periodeDebut);
  const iFin = periodes.indexOf(payload.periodeFin);
  if (iDebut === -1 || iFin === -1 || iFin < iDebut) {
    throw new Error("Plage de périodes invalide.");
  }

  for (let i = iDebut; i <= iFin; i++) {
    _ajouterLigneAjustement(payload.idEleve, payload.nomEleve, payload.base, periodes[i], montant, payload.motif, payload.encaisseur);
  }
  return "Montant dû mis à jour sur " + (iFin - iDebut + 1) + " mois.";
}

// ============================================================
//  INSCRIPTION D'UN ÉLÈVE (+ paiement du frais d'inscription)
// ============================================================
function enregistrerEleve(data, encaisseurActuel, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  // Compte verrouillé sur une base : on impose cette base, quoi qu'envoie le client
  if (session.base) data.base = session.base;

  if (!data.base || !BASES[data.base]) throw new Error("Base invalide ou non spécifiée.");
  if (!data.niveau || !NIVEAUX[data.niveau]) throw new Error("Niveau invalide.");
  if (!data.matriculeLycee || !data.matriculeLycee.trim()) throw new Error("Le matricule lycée est requis.");

  const serie = (NIVEAUX[data.niveau].series !== false) ? data.serie : "";
  _validerNiveauSerie(data.niveau, serie);

  if (!_baseAutorisePourNiveau(data.base, data.niveau, serie)) {
    throw new Error(
      `⚠️ ${data.base} n'accueille pas ce profil. Kokrenou est réservé à la 3e, la 2nde (série C) et la Tle (série D).`
    );
  }

  // ---- Mois d'arrivée : l'élève n'est dû qu'à partir de ce mois inclus ----
  const periodesValides = _getPeriodes().map(p => p.key);
  if (!data.moisArrivee || periodesValides.indexOf(data.moisArrivee) === -1) {
    throw new Error("Mois d'arrivée invalide.");
  }

  // ---- Vérification doublon (Nom + Prénoms, toutes bases confondues) ----
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const nomRecherche     = data.nom.toUpperCase().trim();
  const prenomsRecherche = data.prenoms.toLowerCase().trim();

  for (const nomBase of BASES_LISTE) {
    for (const nvx of NIVEAUX_LISTE) {
      for (const v of _variantesNiveau(nvx)) {
        const sheetVerif = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
        if (!sheetVerif) continue;
        const rows = sheetVerif.getDataRange().getValues();
        for (let i = 1; i < rows.length; i++) {
          const nomExistant     = String(rows[i][1]).toUpperCase().trim();
          const prenomsExistant = String(rows[i][2]).toLowerCase().trim();
          if (nomExistant === nomRecherche && prenomsExistant === prenomsRecherche) {
            throw new Error(
              `⚠️ Doublon détecté : ${data.nom.toUpperCase()} ${data.prenoms} est déjà inscrit(e) — ${nomBase} / ${nvx} (ID : ${rows[i][0]}).`
            );
          }
        }
      }
    }
  }

  // ---- Montants (Cas Social = montants personnalisés, sinon barème standard) ----
  const isSocial = data.isSocial === "on";

  let montantMensuel = NIVEAUX[data.niveau].montantMensuel;
  if (isSocial && data.montantMensuelSocial) {
    const custom = parseFloat(data.montantMensuelSocial);
    if (!isNaN(custom) && custom >= 0) montantMensuel = custom;
  }

  let fraisInscription = FRAIS_INSCRIPTION_STANDARD;
  if (isSocial && data.fraisInscriptionSocial) {
    const custom = parseFloat(data.fraisInscriptionSocial);
    if (!isNaN(custom) && custom >= 0) fraisInscription = custom;
  }

  // ---- Feuille dédiée à ce couple Base × Niveau (× Série pour la Tle) ----
  const sheet = _getOuCreerFeuilleEleves(data.base, data.niveau, serie);
  const headers = _headersPourNiveau(data.niveau);

  // Préfixe d'ID : base + niveau + série si applicable (ex: ZAH6, ZAH2A, ZAHTD)
  const prefixe = BASES[data.base] + NIVEAU_CODES[data.niveau] + (serie || "");
  const id = _genererNouvelId(sheet, prefixe);
  const pinEleve = _genererPin(4);

  const valeurs = {
    "ID": id, "Nom": data.nom.toUpperCase(), "Prénoms": data.prenoms,
    "Sexe": data.sexe, "École": data.ecole, "Matricule lycée": "'" + (data.matriculeLycee || ""), "Série": serie,
    "Téléphone élève": "'" + (data.telEleve || ""), "Téléphone parent": "'" + (data.telParent || ""),
    "Cas Social": isSocial ? "Oui" : "Non", "Mois d'arrivée": "'" + data.moisArrivee,
    "Montant mensuel": montantMensuel, "Date inscription": new Date(), "PIN": "'" + pinEleve
  };
  sheet.appendRow(headers.map(h => valeurs[h] !== undefined ? valeurs[h] : ""));

  // ---- Paiement du frais d'inscription (toujours encaissé à l'inscription) ----
  const nomComplet = data.nom.toUpperCase() + " " + data.prenoms;
  _enregistrerLignePaiement(
    id, nomComplet, data.base, "Inscription", "-",
    fraisInscription, data.moyenInscription, encaisseurActuel, data.tierceInscription, session.user
  );

  return { id: id, nom: data.nom + " " + data.prenoms, montantMensuel: montantMensuel, pin: pinEleve };
}

// ============================================================
//  ENREGISTREMENT D'UN PAIEMENT MENSUEL
// ============================================================
function enregistrerPaiementMensuel(payData, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (session.base) payData.base = session.base;

  if (!payData.base || !payData.idEleve || !payData.periode) {
    throw new Error("Donnée manquante (base, élève ou période).");
  }
  const montant = parseFloat(payData.montant);
  if (!montant || montant <= 0) {
    throw new Error("Montant invalide.");
  }

  // Calcul du reste dû pour ce mois précis, pour empêcher un dépassement.
  const eleveInfo = _trouverEleveParId(payData.base, payData.idEleve);
  const montantMensuelDefaut = eleveInfo ? eleveInfo.montantMensuel : 0;
  const ajustements = _lireAjustements(payData.base);
  const cleAjust = payData.idEleve + "|" + payData.periode;
  const du = ajustements.hasOwnProperty(cleAjust) ? ajustements[cleAjust] : montantMensuelDefaut;

  const sheetP = _getSheetPaiements();
  const dataP = sheetP.getDataRange().getValues();
  let dejaPaye = 0;
  for (let i = 1; i < dataP.length; i++) {
    const [ , idEleve, , base, type, periodeBrute, m ] = dataP[i];
    if (idEleve === payData.idEleve && base === payData.base && type === "Mensualité" && _normaliserCleMois(periodeBrute) === payData.periode) {
      dejaPaye += parseFloat(m) || 0;
    }
  }
  const restant = Math.max(0, du - dejaPaye);
  if (montant > restant) {
    throw new Error(`Montant trop élevé : il reste ${restant} FCFA à payer pour ce mois (déjà encaissé : ${dejaPaye} sur ${du} dû).`);
  }

  _enregistrerLignePaiement(
    payData.idEleve, payData.nomEleve, payData.base, "Mensualité", payData.periode,
    montant, payData.moyen, payData.encaisseur, payData.tierce, session.user
  );

  return "Paiement enregistré avec succès !";
}

// ============================================================
//  LISTE DES ÉLÈVES + GRILLE DE PAIEMENT MENSUEL
//  (ciblée par Base × Niveau × Série pour une recherche rapide)
// ============================================================
function getElevesEtGrille(nomBase, niveau, serie, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (session.base) nomBase = session.base;
  const periodes = _getPeriodes();
  if (!nomBase || !niveau) return { periodes: periodes, eleves: [] };

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Pour la Terminale (scindée par série), la série choisit la feuille.
  // Pour 2nde/1ère (série en colonne), la feuille est unique et la série
  // ne sert qu'à filtrer la liste après lecture, si elle est précisée.
  const niveauSplitParSerie = NIVEAUX_SPLIT_PAR_SERIE.indexOf(niveau) !== -1;
  const sheet = ss.getSheetByName(_nomFeuille(nomBase, niveau, niveauSplitParSerie ? serie : null));

  const eleves = {};
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    if (data.length > 1) {
      const idx = _indexHeaders(data[0]);
      for (let i = 1; i < data.length; i++) {
        const serieEleve = idx.hasOwnProperty("Série") ? data[i][idx["Série"]] : (niveauSplitParSerie ? serie : "");
        if (!niveauSplitParSerie && serie && serieEleve !== serie) continue; // filtre optionnel

        const id = data[i][0];
        const moisArriveeBrut = idx.hasOwnProperty("Mois d'arrivée") ? _normaliserCleMois(data[i][idx["Mois d'arrivée"]]) : "";
        eleves[id] = {
          id: id,
          nom: data[i][idx["Nom"]],
          prenoms: data[i][idx["Prénoms"]],
          niveau: niveau,
          serie: serieEleve,
          casSocial: data[i][idx["Cas Social"]] === "Oui",
          moisArrivee: moisArriveeBrut || periodes[0].key, // repli : ancienne donnée sans ce champ = présent dès le début
          montantMensuel: parseFloat(data[i][idx["Montant mensuel"]]) || 0,
          paiementsParPeriode: {} // { "2026-09": montantEncaisse }
        };
        periodes.forEach(p => eleves[id].paiementsParPeriode[p.key] = 0);
      }
    }
  }

  // Agrégation des paiements "Mensualité" de cette base (filtré ensuite par
  // les ID élèves déjà chargés, donc reste correct même si la feuille est ciblée).
  const sheetP = ss.getSheetByName('paiements');
  if (sheetP) {
    const dataP = sheetP.getDataRange().getValues();
    for (let i = 1; i < dataP.length; i++) {
      const [ , idEleve, , base, type, periodeBrute, montant ] = dataP[i];
      const periode = _normaliserCleMois(periodeBrute);
      if (base !== nomBase || type !== "Mensualité") continue;
      if (eleves[idEleve] && eleves[idEleve].paiementsParPeriode.hasOwnProperty(periode)) {
        eleves[idEleve].paiementsParPeriode[periode] += parseFloat(montant) || 0;
      }
    }
  }

  // Ajustements ponctuels du montant dû (ex: réductions Cas Social variables par mois)
  const ajustements = _lireAjustements(nomBase);

  // Calcul du statut par période — les mois avant le mois d'arrivée ne sont pas dus.
  const liste = Object.values(eleves).map(e => {
    e.statutParPeriode = {};
    const indexArrivee = periodes.findIndex(p => p.key === e.moisArrivee);
    periodes.forEach((p, iP) => {
      const paye = e.paiementsParPeriode[p.key] || 0;

      if (indexArrivee !== -1 && iP < indexArrivee) {
        e.statutParPeriode[p.key] = { paye: paye, du: 0, statut: "avant", ajuste: false };
        return;
      }

      const cleAjust = e.id + "|" + p.key;
      const ajuste = ajustements.hasOwnProperty(cleAjust);
      const du = ajuste ? ajustements[cleAjust] : e.montantMensuel;
      let statut;
      if (du === 0) statut = "exonere";    // rien à payer (pause, abandon, exonération...)
      else if (paye >= du) statut = "paye";
      else if (paye > 0) statut = "partiel";
      else statut = "impaye";
      e.statutParPeriode[p.key] = { paye: paye, du: du, statut: statut, ajuste: ajuste };
    });
    return e;
  });

  liste.sort((a, b) => (a.nom + " " + a.prenoms).localeCompare(b.nom + " " + b.prenoms));
  return { periodes: periodes, eleves: liste };
}

// ============================================================
//  DASHBOARD
// ============================================================
function getDashboardStats(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const periodes = _getPeriodes();

  let stats = {
    totalEleves: 0,
    totalInscriptions: 0,
    totalMensualites: 0,
    repartitionBase: BASES_LISTE.map(b => ({ base: b, count: 0 })),
    repartitionNiveau: NIVEAUX_LISTE.map(n => ({ niveau: n, count: 0 })),
    recouvrementParPeriode: periodes.map(p => ({ periodeKey: p.key, periode: p.label, du: 0, encaisse: 0 })),
    periodeCouranteKey: _getPeriodeCouranteKey(periodes)
  };

  const elevesInfo = []; // { id, montantMensuel, moisArrivee } — tous, toutes bases confondues

  BASES_LISTE.forEach((nomBase, iBase) => {
    NIVEAUX_LISTE.forEach((niveau, iNiveau) => {
      _variantesNiveau(niveau).forEach(v => {
        const sheet = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
        if (!sheet) return;
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return;

        const idx = _indexHeaders(data[0]);
        const count = data.length - 1;
        stats.totalEleves += count;
        stats.repartitionBase[iBase].count += count;
        stats.repartitionNiveau[iNiveau].count += count;

        for (let i = 1; i < data.length; i++) {
          const moisArriveeBrut = idx.hasOwnProperty("Mois d'arrivée") ? _normaliserCleMois(data[i][idx["Mois d'arrivée"]]) : "";
          elevesInfo.push({
            id: data[i][0],
            montantMensuel: parseFloat(data[i][idx["Montant mensuel"]]) || 0,
            moisArrivee: moisArriveeBrut || periodes[0].key
          });
        }
      });
    });
  });

  // Montant attendu par période = somme des montants dus, ajustements ponctuels
  // pris en compte, en excluant les élèves pas encore arrivés ce mois-là.
  const ajustements = _lireAjustements(); // toutes bases
  stats.recouvrementParPeriode.forEach((r, iPeriode) => {
    const cleP = periodes[iPeriode].key;
    r.du = elevesInfo.reduce((total, e) => {
      const indexArrivee = periodes.findIndex(p => p.key === e.moisArrivee);
      if (indexArrivee !== -1 && iPeriode < indexArrivee) return total; // pas encore arrivé
      const cleAjust = e.id + "|" + cleP;
      const du = ajustements.hasOwnProperty(cleAjust) ? ajustements[cleAjust] : e.montantMensuel;
      return total + du;
    }, 0);
  });

  const sheetP = ss.getSheetByName('paiements');
  if (sheetP) {
    const dataP = sheetP.getDataRange().getValues();
    for (let i = 1; i < dataP.length; i++) {
      const [ , , , , type, periodeBrute, montant ] = dataP[i];
      const periode = _normaliserCleMois(periodeBrute);
      const m = parseFloat(montant) || 0;
      if (type === "Inscription") stats.totalInscriptions += m;
      if (type === "Mensualité") {
        stats.totalMensualites += m;
        const entry = stats.recouvrementParPeriode.find(r => r.periodeKey === periode);
        if (entry) entry.encaisse += m;
      }
    }
  }

  stats.totalEncaisse = stats.totalInscriptions + stats.totalMensualites;
  return stats;
}

// ============================================================
//  DÉTAIL DU RECOUVREMENT POUR UNE PÉRIODE PRÉCISE
//  (ventilé par base et par niveau — pour la navigation mois par mois)
// ============================================================
function getRecouvrementDetailPeriode(periodeKey, token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const periodes = _getPeriodes();
  const iPeriode = periodes.findIndex(p => p.key === periodeKey);
  if (iPeriode === -1) throw new Error("Période invalide.");

  const ajustements = _lireAjustements(); // toutes bases

  let resultat = {
    periodeLabel: periodes[iPeriode].label,
    parBase: BASES_LISTE.map(b => ({ base: b, attendu: 0, encaisse: 0 })),
    parNiveau: NIVEAUX_LISTE.map(n => ({ niveau: n, attendu: 0, encaisse: 0 })),
    totalAttendu: 0,
    totalEncaisse: 0
  };

  // idEleve -> { iBase, iNiveau } pour ventiler ensuite l'encaissé par niveau
  // (le paiement porte déjà la base, mais pas le niveau).
  const localisationEleve = {};

  BASES_LISTE.forEach((nomBase, iBase) => {
    NIVEAUX_LISTE.forEach((niveau, iNiveau) => {
      _variantesNiveau(niveau).forEach(v => {
        const sheet = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
        if (!sheet) return;
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) return;
        const idx = _indexHeaders(data[0]);

        for (let i = 1; i < data.length; i++) {
          const id = data[i][0];
          localisationEleve[id] = { iBase: iBase, iNiveau: iNiveau };

          const montantMensuel = parseFloat(data[i][idx["Montant mensuel"]]) || 0;
          const moisArriveeBrut = idx.hasOwnProperty("Mois d'arrivée") ? _normaliserCleMois(data[i][idx["Mois d'arrivée"]]) : "";
          const moisArrivee = moisArriveeBrut || periodes[0].key;
          const indexArrivee = periodes.findIndex(p => p.key === moisArrivee);
          if (indexArrivee !== -1 && iPeriode < indexArrivee) continue; // pas encore arrivé ce mois-là

          const cleAjust = id + "|" + periodeKey;
          const du = ajustements.hasOwnProperty(cleAjust) ? ajustements[cleAjust] : montantMensuel;

          resultat.parBase[iBase].attendu += du;
          resultat.parNiveau[iNiveau].attendu += du;
          resultat.totalAttendu += du;
        }
      });
    });
  });

  const sheetP = ss.getSheetByName('paiements');
  if (sheetP) {
    const dataP = sheetP.getDataRange().getValues();
    for (let i = 1; i < dataP.length; i++) {
      const [ , idEleve, , base, type, periodeBrute, montant ] = dataP[i];
      const periode = _normaliserCleMois(periodeBrute);
      if (type !== "Mensualité" || periode !== periodeKey) continue;
      const m = parseFloat(montant) || 0;
      resultat.totalEncaisse += m;

      const iBase = BASES_LISTE.indexOf(base);
      if (iBase !== -1) resultat.parBase[iBase].encaisse += m;

      const loc = localisationEleve[idEleve];
      if (loc) resultat.parNiveau[loc.iNiveau].encaisse += m;
    }
  }

  return resultat;
}

// Recettes (tous types confondus) pour une date donnée — inchangé dans l'esprit de l'original
function getStatsDuJour(dateString, token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetP = ss.getSheetByName('paiements');
  if (!sheetP) return 0;

  const data = sheetP.getDataRange().getValues();
  const parts = dateString.split('-');
  const jCible = parseInt(parts[2], 10);
  const mCible = parseInt(parts[1], 10) - 1;
  const aCible = parseInt(parts[0], 10);

  let total = 0;
  for (let i = 1; i < data.length; i++) {
    const d = new Date(data[i][7]); // colonne "Date"
    if (!isNaN(d.getTime()) && d.getDate() === jCible && d.getMonth() === mCible && d.getFullYear() === aCible) {
      total += parseFloat(data[i][6]) || 0; // colonne "Montant"
    }
  }
  return total;
}

// ============================================================
//  ENCADREURS — gérés par le superviseur (pas de compte manuel dans le
//  code : chaque encadreur reçoit un ID + PIN généré à sa création).
// ============================================================
// Insère une colonne manquante juste avant une colonne de référence
// (utilitaire de migration rétroactive, réutilisable pour toute évolution
// future de la structure de la feuille encadreurs).
function _assurerColonne(sheet, nomColonne, avantColonne) {
  const derniereColonne = sheet.getLastColumn();
  const headersActuels = sheet.getRange(1, 1, 1, derniereColonne).getValues()[0];
  if (headersActuels.indexOf(nomColonne) !== -1) return; // déjà présente
  const idxRef = headersActuels.indexOf(avantColonne);
  const positionInsertion = idxRef !== -1 ? idxRef + 1 : derniereColonne + 1; // 1-indexé
  sheet.insertColumnBefore(positionInsertion);
  sheet.getRange(1, positionInsertion).setValue(nomColonne);
}

function _getSheetEncadreurs() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('encadreurs');
  if (!sheet) {
    sheet = ss.insertSheet('encadreurs');
    const headers = ["ID", "Nom", "Prénoms", "Téléphone", "Matières", "Bases", "Statut", "PIN", "Catégorie ancienneté", "Date création"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  } else {
    // Migration rétroactive pour les feuilles créées avant cette colonne.
    _assurerColonne(sheet, "Catégorie ancienneté", "Date création");
  }
  return sheet;
}

// Crée un nouvel encadreur. matieres/bases sont des tableaux de chaînes,
// stockés séparés par virgule (simple à lire/écrire, suffisant pour ce volume).
// Réservé à l'administration et aux superviseurs (comptes avec accès stats).
function creerEncadreur(data, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (!session.canSeeStats) throw new Error("Seuls l'administration et les superviseurs peuvent créer un encadreur.");
  if (!data.nom || !data.prenoms) throw new Error("Nom et prénoms requis.");
  if (!data.bases || !data.bases.length) throw new Error("Sélectionnez au moins une base.");

  const sheet = _getSheetEncadreurs();
  const id = "ENC" + sheet.getLastRow().toString().padStart(3, '0');
  const pin = _genererPin(4);

  const categorieAnciennete = CATEGORIES_ANCIENNETE_LISTE.indexOf(data.categorieAnciennete) !== -1
    ? data.categorieAnciennete : "1ère année";

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const valeurs = {
    "ID": id, "Nom": data.nom.toUpperCase(), "Prénoms": data.prenoms,
    "Téléphone": "'" + (data.telephone || ""),
    "Matières": (data.matieres || []).join(", "),
    "Bases": (data.bases || []).join(", "),
    "Statut": "Actif", "PIN": "'" + pin,
    "Catégorie ancienneté": categorieAnciennete,
    "Date création": new Date()
  };
  sheet.appendRow(headers.map(h => valeurs[h] !== undefined ? valeurs[h] : ""));

  return { id: id, pin: pin, nom: data.nom.toUpperCase() + " " + data.prenoms };
}

function getListeEncadreurs(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  const sheet = _getSheetEncadreurs();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    const categorieBrute = idx.hasOwnProperty("Catégorie ancienneté") ? (data[i][idx["Catégorie ancienneté"]] || "1ère année") : "1ère année";
    // Traduit un éventuel ancien nom de catégorie (avant renommage) vers son
    // équivalent actuel, avec repli final sur "1ère année" si vraiment inconnu.
    const categorieTraduite = _ANCIENS_NOMS_CATEGORIES[categorieBrute] || categorieBrute;
    const categorie = CATEGORIES_ANCIENNETE.hasOwnProperty(categorieTraduite) ? categorieTraduite : "1ère année";
    liste.push({
      id: data[i][idx["ID"]],
      nom: data[i][idx["Nom"]],
      prenoms: data[i][idx["Prénoms"]],
      telephone: String(data[i][idx["Téléphone"]] || ""),
      matieres: String(data[i][idx["Matières"]] || "").split(",").map(s => s.trim()).filter(Boolean),
      bases: String(data[i][idx["Bases"]] || "").split(",").map(s => s.trim()).filter(Boolean),
      statut: data[i][idx["Statut"]],
      categorieAnciennete: categorie,
      tauxAnciennete: CATEGORIES_ANCIENNETE[categorie]
    });
  }
  liste.sort((a, b) => (a.nom + " " + a.prenoms).localeCompare(b.nom + " " + b.prenoms));
  return liste;
}

// L'ancienneté évolue avec le temps : réservé à l'administration et aux
// superviseurs, comme la création.
function modifierCategorieAncienneteEncadreur(idEncadreur, nouvelleCategorie, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (!session.canSeeStats) throw new Error("Seuls l'administration et les superviseurs peuvent modifier l'ancienneté d'un encadreur.");
  if (CATEGORIES_ANCIENNETE_LISTE.indexOf(nouvelleCategorie) === -1) throw new Error("Catégorie d'ancienneté invalide.");

  const sheet = _getSheetEncadreurs();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idEncadreur) {
      sheet.getRange(i + 1, idx["Catégorie ancienneté"] + 1).setValue(nouvelleCategorie);
      return "Ancienneté mise à jour.";
    }
  }
  throw new Error("Encadreur introuvable.");
}

// Expose la liste des catégories (et leurs tarifs par séance) pour peupler le sélecteur côté écran.
function getCategoriesAnciennete(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  return CATEGORIES_ANCIENNETE_LISTE.map(cat => ({ nom: cat, taux: CATEGORIES_ANCIENNETE[cat] }));
}

// Active/désactive un encadreur (au lieu de le supprimer, pour garder
// l'historique des séances déjà associées à son ID). Même restriction que
// la création : administration et superviseurs uniquement.
function modifierStatutEncadreur(idEncadreur, nouveauStatut, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (!session.canSeeStats) throw new Error("Seuls l'administration et les superviseurs peuvent modifier un encadreur.");

  const sheet = _getSheetEncadreurs();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idEncadreur) {
      sheet.getRange(i + 1, idx["Statut"] + 1).setValue(nouveauStatut);
      return "Statut mis à jour.";
    }
  }
  throw new Error("Encadreur introuvable.");
}

// ============================================================
//  MATIÈRES — liste fixe globale, valable pour tous les niveaux.
// ============================================================
function getListeMatieres(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  return MATIERES;
}

// ============================================================
//  SÉANCES — date + créneau fixe + classe + matière + encadreur du jour.
//  Créées manuellement une par une (pas de génération automatique).
//  Réservé à l'administration et aux superviseurs, comme les encadreurs.
// ============================================================
function _getSheetSeances() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('seances');
  if (!sheet) {
    sheet = ss.insertSheet('seances');
    const headers = ["ID", "Date", "Jour", "Horaire", "Base", "Niveau", "Série", "Groupe", "Matières", "Type", "ID Encadreur", "Nom Encadreur", "Statut", "Créée par", "Date création"];
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setBackground("#2C3E50").setFontColor("white").setFontWeight("bold");
  } else {
    // Migration : l'ancienne colonne "Matière" (singulier, une seule matière)
    // devient "Matières" (pluriel, plusieurs possibles) — on renomme simplement,
    // les séances déjà créées gardent leur unique matière dans la nouvelle colonne.
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idxAncienne = headers.indexOf("Matière");
    if (idxAncienne !== -1) sheet.getRange(1, idxAncienne + 1).setValue("Matières");

    // Migration : colonne "Type" (Normale/Congés/Prépa BAC), absente des
    // séances créées avant cette distinction — on les considère "Normale"
    // par défaut (comportement inchangé pour l'historique existant).
    const headersActuels = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headersActuels.indexOf("Type") === -1) {
      const idxEncadreur = headersActuels.indexOf("ID Encadreur");
      const position = idxEncadreur !== -1 ? idxEncadreur + 1 : sheet.getLastColumn() + 1;
      sheet.insertColumnBefore(position);
      sheet.getRange(1, position).setValue("Type");
      const nbLignes = sheet.getLastRow() - 1;
      if (nbLignes > 0) {
        const valeurs = Array(nbLignes).fill(["Normale"]);
        sheet.getRange(2, position, nbLignes, 1).setValues(valeurs);
      }
    }

    // Migration : colonne "Groupe" (Tle D de Zaher uniquement), vide par
    // défaut pour toutes les séances déjà créées.
    _assurerColonne(sheet, "Groupe", "Matières");
  }
  return sheet;
}

// Expose la configuration des créneaux (jours/horaires/restriction) au frontend,
// pour construire le formulaire de création sans dupliquer les règles.
function getConfigCreneaux(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  return { creneaux: CRENEAUX, niveauxClassesExamen: NIVEAUX_CLASSES_EXAMEN };
}

// Détermine le jour de la semaine (au sens CRENEAUX) d'une date "AAAA-MM-JJ",
// ou null si ce jour n'a pas cours du tout.
function _jourCreneau(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const jourSemaine = d.getDay(); // 0=Dimanche...6=Samedi
  return CRENEAUX.hasOwnProperty(jourSemaine) ? jourSemaine : null;
}

// Crée une nouvelle séance, avec validation complète du créneau (jour valide,
// horaire valide pour ce jour, classe autorisée ce jour-là).
function creerSeance(data, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  // Autorisé pour : l'équipe (admin/superviseurs), OU un encadreur connecté
  // créant une séance pour lui-même (jamais pour un autre).
  const estStaffAutorise = session.canSeeStats === true;
  const estEncadreurPourSoiMeme = session.typeCompte === "encadreur" && session.idEncadreur === data.idEncadreur;
  if (!estStaffAutorise && !estEncadreurPourSoiMeme) {
    throw new Error("Tu ne peux créer une séance que pour toi-même.");
  }

  if (!data.date || !data.horaire || !data.base || !data.niveau || !data.matieres || !data.matieres.length || !data.idEncadreur) {
    throw new Error("Merci de renseigner tous les champs (date, horaire, base, classe, au moins une matière, encadreur).");
  }

  const aujourdhui = new Date();
  const aujourdhuiStr = aujourdhui.getFullYear() + "-" + (aujourdhui.getMonth() + 1).toString().padStart(2, '0') + "-" + aujourdhui.getDate().toString().padStart(2, '0');
  if (data.date > aujourdhuiStr) {
    throw new Error("Impossible de déclarer une séance pour un jour qui n'est pas encore arrivé.");
  }

  const type = TYPES_SEANCE.indexOf(data.type) !== -1 ? data.type : "Normale";
  const estRegimeSpecial = (type === "Congés" || type === "Prépa BAC");

  // En période de Congés/Prépa BAC, les cours peuvent se tenir n'importe
  // quel jour de la semaine (raison même de leur tarif différent) — pas
  // seulement Mercredi/Samedi/Dimanche comme en période normale.
  let jourNom;
  if (estRegimeSpecial) {
    const d = new Date(data.date + "T00:00:00");
    if (isNaN(d.getTime())) throw new Error("Date invalide.");
    jourNom = JOURS_SEMAINE_NOMS[d.getDay()];
    if (["Matin", "Soir"].indexOf(data.horaire) === -1) throw new Error("Horaire invalide (Matin ou Soir).");
  } else {
    const jourSemaine = _jourCreneau(data.date);
    if (jourSemaine === null) {
      throw new Error("Ce jour n'a pas cours en période normale (seuls Mercredi, Samedi et Dimanche) — sauf en Congés ou Prépa BAC.");
    }
    const creneauJour = CRENEAUX[jourSemaine];
    if (creneauJour.horaires.indexOf(data.horaire) === -1) {
      throw new Error(creneauJour.nom + " n'a de cours que le : " + creneauJour.horaires.join(", ") + ".");
    }
    if (!creneauJour.toutesClasses && NIVEAUX_CLASSES_EXAMEN.indexOf(data.niveau) === -1) {
      throw new Error(creneauJour.nom + " est réservé aux classes d'examen (3e et Terminale).");
    }
    jourNom = creneauJour.nom;
  }

  if (!NIVEAUX.hasOwnProperty(data.niveau)) throw new Error("Niveau invalide.");
  const serie = (NIVEAUX[data.niveau].series !== false) ? (data.serie || "") : "";

  // Groupe : seule la Tle D de Zaher est répartie sur 3 salles en parallèle.
  // Partout ailleurs, le groupe reste vide (une seule salle par classe).
  let groupe = "";
  if (_estCasGroupeTleDZaher(data.base, data.niveau, serie)) {
    if (GROUPES_TLE_D_ZAHER.indexOf(data.groupe) === -1) {
      throw new Error("Merci de choisir un groupe (A, B ou C) pour la Tle D de Zaher.");
    }
    groupe = data.groupe;
  }

  const matieresInvalides = data.matieres.filter(m => MATIERES.indexOf(m) === -1);
  if (matieresInvalides.length > 0) throw new Error("Matière(s) invalide(s) : " + matieresInvalides.join(", "));

  // L'encadreur doit être actif et intervenir sur cette base. Il n'a plus
  // besoin d'être déclaré pour les matières choisies : une urgence peut
  // obliger à improviser un remplacement hors matière habituelle.
  const encadreurs = getListeEncadreurs(token);
  const encadreur = encadreurs.find(e => e.id === data.idEncadreur);
  if (!encadreur) throw new Error("Encadreur introuvable.");
  if (encadreur.statut !== "Actif") throw new Error("Cet encadreur est inactif.");
  if (encadreur.bases.indexOf(data.base) === -1) throw new Error("Cet encadreur n'intervient pas sur cette base.");

  const sheet = _getSheetSeances();

  // Anti-doublon : une classe (base+niveau+série+groupe) ne peut pas avoir
  // deux séances actives (Prévue/Faite) au même créneau (date+horaire),
  // tenues par deux encadreurs différents.
  const dataExistante = sheet.getDataRange().getValues();
  const idxExistant = _indexHeaders(dataExistante[0]);
  for (let i = 1; i < dataExistante.length; i++) {
    if (dataExistante[i][idxExistant["Statut"]] === "Annulée") continue;
    if (_normaliserDateComplete(dataExistante[i][idxExistant["Date"]]) === data.date &&
        dataExistante[i][idxExistant["Horaire"]] === data.horaire &&
        dataExistante[i][idxExistant["Base"]] === data.base &&
        dataExistante[i][idxExistant["Niveau"]] === data.niveau &&
        String(dataExistante[i][idxExistant["Série"]] || "") === serie &&
        String(dataExistante[i][idxExistant["Groupe"]] || "") === groupe) {
      const idEncadreurExistant = dataExistante[i][idxExistant["ID Encadreur"]];
      const encadreurExistant = encadreurs.find(e => e.id === idEncadreurExistant);
      const contact = encadreurExistant && encadreurExistant.telephone ? " — " + encadreurExistant.telephone : "";
      throw new Error("Une séance existe déjà pour cette classe à ce créneau (" + dataExistante[i][idxExistant["Nom Encadreur"]] + contact + ").");
    }
  }

  const id = "SEA" + sheet.getLastRow().toString().padStart(4, '0');

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const valeurs = {
    "ID": id, "Date": "'" + data.date, "Jour": jourNom, "Horaire": data.horaire,
    "Base": data.base, "Niveau": data.niveau, "Série": serie, "Groupe": groupe, "Matières": data.matieres.join(", "),
    "Type": type, "ID Encadreur": data.idEncadreur, "Nom Encadreur": encadreur.nom + " " + encadreur.prenoms,
    "Statut": "Faite", "Créée par": session.nom || (encadreur.nom + " " + encadreur.prenoms), "Date création": new Date()
  };
  sheet.appendRow(headers.map(h => valeurs[h] !== undefined ? valeurs[h] : ""));

  return { id: id };
}

// Liste les séances (triées par date décroissante = les plus récentes/proches en premier).
function getListeSeances(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  const sheet = _getSheetSeances();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const idx = _indexHeaders(data[0]);

  const liste = [];
  for (let i = 1; i < data.length; i++) {
    liste.push({
      id: data[i][idx["ID"]],
      date: _normaliserDateComplete(data[i][idx["Date"]]),
      jour: data[i][idx["Jour"]],
      horaire: data[i][idx["Horaire"]],
      base: data[i][idx["Base"]],
      niveau: data[i][idx["Niveau"]],
      serie: data[i][idx["Série"]],
      groupe: idx.hasOwnProperty("Groupe") ? (data[i][idx["Groupe"]] || "") : "",
      matieres: String(data[i][idx["Matières"]] || "").split(",").map(s => s.trim()).filter(Boolean),
      type: idx.hasOwnProperty("Type") ? (data[i][idx["Type"]] || "Normale") : "Normale",
      idEncadreur: data[i][idx["ID Encadreur"]],
      nomEncadreur: data[i][idx["Nom Encadreur"]],
      statut: data[i][idx["Statut"]]
    });
  }
  liste.sort((a, b) => b.date.localeCompare(a.date) || (b.horaire || "").localeCompare(a.horaire || ""));
  return liste;
}

// Toutes les séances (non annulées) d'un jour donné, tous établissements et
// classes confondus — pour la vue de supervision de l'équipe.
function getSeancesDuJour(dateStr, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (!session.canSeeStats) throw new Error("Réservé à l'administration et aux superviseurs.");

  return getListeSeances(token)
    .filter(s => s.date === dateStr && s.statut !== "Annulée")
    .sort((a, b) => (a.horaire || "").localeCompare(b.horaire || "") || a.base.localeCompare(b.base) || a.niveau.localeCompare(b.niveau));
}

function getTypesSeance(token) {
  if (!_verifierToken(token)) throw new Error("Session expirée. Reconnectez-vous.");
  return TYPES_SEANCE;
}

// Pour l'espace encadreur : uniquement ses propres séances.
function getMesSeancesEncadreur(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "encadreur") throw new Error("Session expirée. Reconnectez-vous.");
  return getListeSeances(token).filter(s => s.idEncadreur === session.idEncadreur);
}

function getMonProfilEncadreur(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "encadreur") throw new Error("Session expirée. Reconnectez-vous.");
  const moi = getListeEncadreurs(token).find(e => e.id === session.idEncadreur);
  if (!moi) throw new Error("Profil introuvable.");
  return moi;
}

// Paie personnelle — même formule que le rapport côté équipe (2 blocs de 4h
// "Faite" = 1 séance payée au tarif de la catégorie d'ancienneté).
function getMaPaie(dateDebut, dateFin, token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "encadreur") throw new Error("Session expirée. Reconnectez-vous.");

  const moi = getMonProfilEncadreur(token);
  const mesSeances = getMesSeancesEncadreur(token).filter(s =>
    s.statut === "Faite" && (!dateDebut || s.date >= dateDebut) && (!dateFin || s.date <= dateFin)
  );

  const nombreBlocs = mesSeances.filter(s => s.type === "Normale").length;
  const nombreBlocsHorsBareme = mesSeances.filter(s => s.type !== "Normale").length;
  const equivalentSeances = nombreBlocs * 0.5;

  return {
    categorieAnciennete: moi.categorieAnciennete, tauxParSeance: moi.tauxAnciennete,
    nombreBlocs: nombreBlocs, equivalentSeances: equivalentSeances,
    nombreBlocsHorsBareme: nombreBlocsHorsBareme,
    salaireTotal: equivalentSeances * moi.tauxAnciennete
  };
}

// Évolution mois par mois (calendaire, pas les périodes de facturation élève)
// du nombre de séances données et du montant correspondant, pour le graphique
// personnel de l'encadreur — même esprit que le graphique du dashboard admin.
function getEvolutionEncadreur(token) {
  const session = _verifierToken(token);
  if (!session || session.typeCompte !== "encadreur") throw new Error("Session expirée. Reconnectez-vous.");

  const moi = getMonProfilEncadreur(token);
  const seancesFaitesNormales = getMesSeancesEncadreur(token).filter(s => s.statut === "Faite" && s.type === "Normale");

  const parMois = {}; // "AAAA-MM" -> nombre de blocs de 4h
  seancesFaitesNormales.forEach(s => {
    const cle = s.date.slice(0, 7);
    parMois[cle] = (parMois[cle] || 0) + 1;
  });

  const clesTriees = Object.keys(parMois).sort();
  return clesTriees.map(cle => {
    const equivalentSeances = parMois[cle] * 0.5;
    return { periode: cle, nombreSeances: equivalentSeances, montant: equivalentSeances * moi.tauxAnciennete };
  });
}

// Change le statut d'une séance (Prévue / Faite / Annulée) ou réassigne son encadreur.
function modifierSeance(idSeance, champs, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");

  const sheet = _getSheetSeances();
  const data = sheet.getDataRange().getValues();
  const idx = _indexHeaders(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (data[i][idx["ID"]] === idSeance) {
      const estStaffAutorise = session.canSeeStats === true;
      const estEncadreurProprietaire = session.typeCompte === "encadreur" && data[i][idx["ID Encadreur"]] === session.idEncadreur;
      if (!estStaffAutorise && !estEncadreurProprietaire) {
        throw new Error("Tu ne peux modifier que tes propres séances.");
      }
      if (champs.statut) sheet.getRange(i + 1, idx["Statut"] + 1).setValue(champs.statut);
      if (champs.idEncadreur) {
        if (!estStaffAutorise) throw new Error("Seuls l'administration et les superviseurs peuvent réassigner une séance.");
        const encadreurs = getListeEncadreurs(token);
        const encadreur = encadreurs.find(e => e.id === champs.idEncadreur);
        if (!encadreur) throw new Error("Encadreur introuvable.");
        sheet.getRange(i + 1, idx["ID Encadreur"] + 1).setValue(champs.idEncadreur);
        sheet.getRange(i + 1, idx["Nom Encadreur"] + 1).setValue(encadreur.nom + " " + encadreur.prenoms);
      }
      return "Séance mise à jour.";
    }
  }
  throw new Error("Séance introuvable.");
}

// ============================================================
//  PAIE — rapport calculé à la volée à partir des séances "Faite",
//  jamais stocké (toujours recalculé, donc toujours à jour si un statut
//  de séance ou une catégorie d'ancienneté change après coup).
//  Réservé à l'administration et aux superviseurs.
// ============================================================
// Chaque créneau enregistré dans l'appli correspond à un BLOC de 4h. Mais
// "une séance" (l'unité de paiement, au tarif de 6000/8000/9000 F) équivaut
// à 2 blocs de 4h — ex: samedi matin + samedi soir = 1 séance complète ;
// un bloc isolé (dimanche, mercredi, ou un seul créneau du samedi) = une
// demi-séance. D'où la conversion ÷2 ci-dessous.
function getRapportSalaires(dateDebut, dateFin, token) {
  const session = _verifierToken(token);
  if (!session) throw new Error("Session expirée. Reconnectez-vous.");
  if (!session.canSeeStats) throw new Error("Seuls l'administration et les superviseurs peuvent consulter la paie.");

  const encadreurs = getListeEncadreurs(token);
  const seances = getListeSeances(token);

  return encadreurs.map(enc => {
    const seancesEncadreur = seances.filter(s =>
      s.idEncadreur === enc.id && s.statut === "Faite" &&
      (!dateDebut || s.date >= dateDebut) && (!dateFin || s.date <= dateFin)
    );
    // Seuls les blocs "Normale" suivent le barème d'ancienneté. Congés et
    // Prépa BAC ont une tarification différente, pas encore établie : ils
    // sont exclus du total mais comptés à part pour ne pas les oublier.
    const nombreBlocs = seancesEncadreur.filter(s => s.type === "Normale").length;
    const nombreBlocsHorsBareme = seancesEncadreur.filter(s => s.type !== "Normale").length;
    const equivalentSeances = nombreBlocs * 0.5;

    return {
      id: enc.id, nom: enc.nom, prenoms: enc.prenoms, statut: enc.statut,
      categorieAnciennete: enc.categorieAnciennete,
      tauxParSeance: enc.tauxAnciennete,
      nombreBlocs: nombreBlocs, equivalentSeances: equivalentSeances,
      nombreBlocsHorsBareme: nombreBlocsHorsBareme,
      salaireTotal: equivalentSeances * enc.tauxAnciennete
    };
  });
}

// [Usage interne — éditeur Apps Script uniquement, jamais appelée depuis
// l'appli] Colle un ID de paiement (colonne A de "paiements") pour retrouver
// le compte réellement à l'origine de la ligne, indépendamment de ce qui est
// affiché dans "Encaisseur".
function _diagnosticId(idPaiement) {
  for (const cle in _TRACE) {
    if (idPaiement.indexOf(_TRACE[cle]) !== -1) {
      Logger.log("Compte d'origine : " + cle);
      return cle;
    }
  }
  Logger.log("Aucun repère trouvé (compte admin, ou ligne antérieure à cette fonctionnalité).");
  return null;
}

// ============================================================
//  MAINTENANCE — à exécuter MANUELLEMENT depuis l'éditeur Apps Script
//  (sélectionner "nettoyerValeursNaN" dans le menu déroulant, Exécuter)
//  si des "NaN" apparaissent dans l'application. Corrige les cellules déjà
//  écrites avec une valeur invalide (résidu d'un bug corrigé depuis), en les
//  remplaçant par 0. Sans risque à relancer plusieurs fois.
// ============================================================
function nettoyerValeursNaN() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let compteur = 0;
  const details = [];

  function estInvalide(val) {
    if (typeof val === 'number') return isNaN(val);
    if (typeof val === 'string') return val.trim().toLowerCase() === 'nan';
    return false;
  }

  function nettoyerColonne(sheet, indexColonne, libelle) {
    if (!sheet || indexColonne === -1) return;
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (estInvalide(data[i][indexColonne])) {
        sheet.getRange(i + 1, indexColonne + 1).setValue(0);
        compteur++;
        details.push(sheet.getName() + " / " + libelle + " / ligne " + (i + 1) + " (ID: " + data[i][0] + ")");
      }
    }
  }

  // Feuilles élèves : colonne "Montant mensuel"
  BASES_LISTE.forEach(nomBase => {
    NIVEAUX_LISTE.forEach(niveau => {
      _variantesNiveau(niveau).forEach(v => {
        const sheet = ss.getSheetByName(_nomFeuille(nomBase, v.niveau, v.serie));
        if (!sheet || sheet.getLastColumn() === 0) return;
        const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        nettoyerColonne(sheet, headers.indexOf("Montant mensuel"), "Montant mensuel");
      });
    });
  });

  // Paiements : colonne "Montant"
  const sheetP = ss.getSheetByName('paiements');
  if (sheetP && sheetP.getLastColumn() > 0) {
    const headersP = sheetP.getRange(1, 1, 1, sheetP.getLastColumn()).getValues()[0];
    nettoyerColonne(sheetP, headersP.indexOf("Montant"), "Montant (paiement)");
  }

  // Ajustements ponctuels : colonne "Montant dû"
  const sheetA = ss.getSheetByName('ajustements_mensuels');
  if (sheetA && sheetA.getLastColumn() > 0) {
    const headersA = sheetA.getRange(1, 1, 1, sheetA.getLastColumn()).getValues()[0];
    nettoyerColonne(sheetA, headersA.indexOf("Montant dû"), "Montant dû (ajustement)");
  }

  Logger.log(compteur + " cellule(s) corrigée(s) :\n" + details.join("\n"));
  return compteur + " cellule(s) corrigée(s). Voir le journal d'exécution (icône horloge) pour le détail.";
}
