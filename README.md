# Excellence Group — nouvelle stack (Phase 1 du plan)

Ce dépôt contient maintenant deux choses :
- `Code.gs` / `Index.html` — l'app Google Apps Script existante (espace équipe), à garder fonctionnelle pendant la transition (voir Phase 0 du plan).
- `backend/` et `frontend/` — la nouvelle stack : Express + Prisma + PostgreSQL (Neon) côté backend, React + Vite côté frontend.

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
   chaînes de connexion. Pour l'instant, une seule branche suffit tant qu'il n'y a pas de données de production.

## 2. Configurer et démarrer le backend

```bash
cd backend
cp .env.example .env
# Édite .env : colle DATABASE_URL et DIRECT_URL (étape 1), et génère un SESSION_SECRET :
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

npm install                # déjà fait si tu reprends cette session, sinon nécessaire
npx prisma migrate dev --name init   # crée les tables dans Neon à partir de prisma/schema.prisma
npm run prisma:seed        # peuple la config de base (localité, bases Zaher/Kokrenou, niveaux, tarifs...)
npm run dev                 # démarre l'API sur http://localhost:3000
```

Le seed crée un compte staff de test : `admin` / `change-me-now` (à changer dès que possible — pas encore
d'écran "changer mon mot de passe" côté frontend, ce sera à ajouter avec le reste de l'espace équipe).

Vérifie que l'API répond : `curl http://localhost:3000/health` → `{"ok":true}`.

## 3. Démarrer le frontend

```bash
cd frontend
npm install                 # déjà fait si tu reprends cette session, sinon nécessaire
npm run dev                  # démarre sur http://localhost:5173, proxy /api vers localhost:3000
```

Ouvre http://localhost:5173 : page d'accueil avec le choix des 3 espaces. Connecte-toi à l'espace Équipe avec
`admin` / `change-me-now` pour valider que toute la chaîne (frontend → backend → Neon) fonctionne.

## 4. Ce qui existe déjà / ce qu'il reste à faire

Construit dans cette session :
- Schéma Prisma complet (Phase 2 du plan) : localités, bases, niveaux/séries, tarifs, allowlist base×niveau,
  créneaux, matières, élèves, inscriptions, paiements, ajustements, encadreurs, séances, notes/moyennes/examens blancs, comptes staff.
- Auth par cookie de session (JWT httpOnly) pour les 3 types de comptes (staff/élève/encadreur), avec middleware
  `requireAuth`/`requireStats` centralisé (remplace les vérifications `_verifierToken` répétées dans `Code.gs`).
- Page d'accueil + 3 pages de connexion + 3 pages protégées (encore vides) côté frontend.

Pas encore fait (prochaines étapes, dans l'ordre du plan — Phase 3) :
- Espace élève : profil, notes, moyennes, examens blancs (lire `Code.gs` : `getMonProfilEleve`, `getMesNotes`,
  `getMesMoyennes`, `getMesMatieresExamensBlancs`, `getMesTotauxExamensBlancs` pour le contrat à reproduire).
- Espace encadreur : mes séances, ma paie (`getMesSeancesEncadreur`, `getMaPaie`, `getEvolutionEncadreur`).
- Espace staff/admin : inscriptions, encaissement, gestion encadreurs/séances, tableau de bord — c'est la
  partie à migrer avec le plus de soin (paiements en dernier, avec période d'écriture miroir, voir Phase 3).
- Script ETL Sheets → Postgres (`migration/etl-sheets-to-postgres.ts`) une fois prêt à migrer les vraies données.
- Correction du bug Code.gs (déjà fait dans ce dépôt) à recopier dans l'éditeur Apps Script en ligne — l'app
  GAS déployée est probablement encore cassée tant que ce n'est pas fait manuellement là-bas.
