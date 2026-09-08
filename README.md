# Excellence Group — nouvelle stack

Migration totale vers une nouvelle stack (décision du 2026-09-07 : pas de coexistence prolongée avec Google
Apps Script). Ce dépôt contient :
- `Code.gs` / `Index.html` — l'ancienne app Google Apps Script, conservée comme référence de comportement
  pendant la vérification de parité, pas comme filet de secours permanent (voir Phase 3 du plan).
- `backend/` et `frontend/` — la nouvelle stack : Express + Prisma + PostgreSQL (Neon) côté backend, React +
  Vite côté frontend. **Fonctionnellement complète** — toute la logique métier de `Code.gs` est portée.

Le plan complet (contexte, phases, schéma de données, stratégie de migration) est dans
`C:\Users\DELL\.claude\plans\ce-projet-doit-etre-indexed-bachman.md`.

## 1. Créer la base de données Neon (première fois)

1. Va sur https://console.neon.tech et crée un compte (gratuit).
2. Crée un nouveau projet — nomme-le par exemple `eg-renfo`.
3. Dans le dashboard du projet, onglet **Connection Details** :
   - Choisis la base par défaut (`neondb`) et la branche `main`.
   - Tu verras une case à cocher **"Pooled connection"** (ou un menu déroulant) — c'est important :
     - Coche-la → copie l'URL, c'est ta `DATABASE_URL` (host qui contient `-pooler`).
     - Décoche-la → copie l'URL, c'est ta `DIRECT_URL` (host sans `-pooler`).
   - Les deux se ressemblent beaucoup, seule la présence de `-pooler` dans le host les distingue. Si tu les inverses,
     `prisma migrate` échoue avec une erreur de connexion peu claire — vérifie toujours avant de coller.
4. **Branches Neon** (utile plus tard, pas obligatoire maintenant) : tu peux créer une branche `dev` séparée de `main`
   pour ne jamais développer contre les données réelles une fois qu'il y en aura — chaque branche a ses propres
   chaînes de connexion.

## 2. Configurer et démarrer le backend

```bash
cd backend
cp .env.example .env
# Édite .env : colle DATABASE_URL et DIRECT_URL (étape 1), et génère un SESSION_SECRET :
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm install                          # déjà fait si tu reprends cette session, sinon nécessaire
npx prisma migrate dev --name init   # crée les tables dans Neon à partir de prisma/schema.prisma
npm run prisma:seed                  # peuple la config (localité, bases, niveaux, tarifs, écoles, créneaux...)
npm run dev                           # démarre l'API sur http://localhost:3000
```

Le seed crée un compte staff de test : `admin` / `change-me-now` (à changer via "Mon compte" une fois connecté —
si cet écran n'existe pas encore côté frontend, utilise `POST /api/auth/change-credential`).

Vérifie que l'API répond : `curl http://localhost:3000/health` → `{"ok":true}`.
Lance les tests unitaires (calculs financiers, paie, génération d'ID) : `npm test`.

## 3. Démarrer le frontend

```bash
cd frontend
npm install                 # déjà fait si tu reprends cette session, sinon nécessaire
npm run dev                  # démarre sur http://localhost:5173, proxy /api vers localhost:3000
```

Ouvre http://localhost:5173 : page d'accueil avec le choix des 3 espaces.

## 4. Ce qui est fonctionnellement complet

**Backend** — toute la logique métier de `Code.gs` est portée avec parité de comportement (mêmes règles,
mêmes messages d'erreur) : config de référence, inscription + grille de paiement + encaissement + ajustements,
tableau de bord, encadreurs, séances (avec toute la validation créneaux/groupes/anti-doublon), paie, espace
élève (profil/grille/notes/moyennes/examens blancs), auth des 3 types de comptes.

**Frontend** — les 3 espaces sont construits :
- **Équipe** (`/equipe`) : Inscription, Encaissement (grille avec paiement/ajustement/pause), Équipe
  (Encadreurs/Séances/Paie), Tableau de bord (avec graphique d'évolution) — reproduit l'app GAS en production.
- **Élève** (`/eleve`) : profil, grille de paiement en lecture seule, notes/moyennes/examens blancs — n'a
  jamais existé en GAS, construit ici à partir du contrat backend déjà spécifié.
- **Encadreur** (`/encadreur`) : mes séances, ma paie, mon évolution — idem, jamais existé en GAS.

## 5. Ce qu'il reste à faire avant de considérer la migration terminée

- **Tester réellement contre Neon** : tout ce qui précède a été typechecké et buildé, mais jamais exécuté
  contre une vraie base — première vérification à faire une fois `backend/.env` rempli.
- **Vérification de parité** (Phase 3 du plan) : comparer les résultats de l'espace équipe (inscriptions,
  paiements, dashboard) entre l'ancienne app GAS et la nouvelle stack sur des cas réels avant de considérer
  GAS obsolète.
- **Migration des données existantes**, si le Sheet contient déjà des inscriptions/paiements réels : écrire
  le script ETL ponctuel (`migration/etl-sheets-to-postgres.ts`, pas encore créé) qui lit chaque onglet via
  l'API Sheets et peuple Postgres — sinon la nouvelle base démarre vide.
- **Écran "Mon compte"** (changer son code) côté frontend — l'endpoint backend existe
  (`POST /api/auth/change-credential`) mais n'est pas encore branché à une page/modal.
- Le bug de syntaxe dans `Code.gs` a été corrigé dans ce dépôt (ligne 1467) mais reste à recopier dans
  l'éditeur Apps Script en ligne si l'app GAS doit continuer à servir de référence de comportement
  pendant la vérification de parité.
