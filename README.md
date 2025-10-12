# OrderFlow Labo (Boutiques ↔️ Labo)

Application interne pour gérer les commandes des boutiques vers le laboratoire, la consolidation, le plan de production et la tournée de livraison.

## ⚙️ Fonctionnalités
- Authentification par rôles : **admin**, **labo**, **boutique**
- Gestion des produits (admin)
- Commande J+1 par boutique (avec **suggestion** basée sur l'historique de ventes du même jour de semaine)
- **Verrouillage** automatique des commandes à **21:00 Europe/Paris**
- Consolidation labo avec **ajustements** par boutique et par produit
- Génération du **Plan de production** et du **Plan de livraison**
- Export CSV (production, livraisons)
- **SQLite** pour la persistance (`data/app.db`)
- Docker prêt

## 🚀 Démarrage rapide
```bash
# 1) Cloner puis installer
npm install

# 2) Copier l'exemple d'env
cp .env.example .env

# 3) Initialiser la base + données de démo (produits, boutiques, comptes)
node seed.js

# 4) Lancer en dev
npm run dev
# ou en prod
npm start
```

- URL par défaut : http://localhost:3000
- Comptes de démo :
  - admin: **admin@example.com** / **admin123**
  - labo: **labo@example.com** / **labo123**
  - boutique A: **boutiqueA@example.com** / **boutique123**
  - boutique B: **boutiqueB@example.com** / **boutique123**

## ⏰ Logique de cut-off (21:00)
- Avant 21:00: les boutiques peuvent créer/modifier leurs **commandes J+1**
- À partir de 21:00: les commandes sont **gelées** côté boutique ; le **labo** peut faire des **ajustements** de consolidation
- Le fuseau configurable est **Europe/Paris** (voir `config.js`)

## 🧠 Suggestion de quantités
Sur la page de commande boutique, une suggestion par produit est calculée comme la **moyenne des quantités vendues** sur les **14 derniers jours** correspondant au **même jour de semaine**. À défaut d'historique, la suggestion est 0.

## 📦 Exports
- Production plan (CSV)
- Delivery plan (CSV)

## 🧪 Stack
- Node.js + Express
- EJS (SSR)
- SQLite (better-sqlite3)
- bcrypt + express-session

## 🔒 Persistance
Tout est dans `data/app.db`. Sauvegardez ce fichier pour conserver les données.

## 🐳 Docker
```bash
docker compose up --build
```

## 📄 Licence
MIT


## ☁️ Déployer sur Render (gratuit / simple)
1. Crée un compte sur render.com
2. "New +" → "Web Service" → Connecte ton dépôt GitHub
3. Build Command: `npm install && node seed.js`
4. Start Command: `npm start`
5. Environment:
   - `SESSION_SECRET` = une chaîne longue et unique
   - `TZ` = `Europe/Paris`

## 🐙 Pousser sur GitHub (pas à pas)
```bash
git init
git add .
git commit -m "first commit"
git branch -M main
git remote add origin https://github.com/<ton_compte>/<ton_repo>.git
git push -u origin main
```

## 🐳 Docker (prod rapide)
```bash
docker compose up --build -d
# App: http://localhost:3000
# Volume data: ./data (persistance)
```
