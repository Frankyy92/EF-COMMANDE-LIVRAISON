# Orderflow Project (Express + EJS)

Application de démonstration **Commande & Livraison** avec sélecteur de rôle, menu latéral, vues responsive,
session admin protégée par mot de passe, et gestion simple des **produits** / **catégories** / **commandes**.

## 🚀 Lancer en local

```bash
npm install
cp .env.example .env   # puis éditez .env si besoin
npm start
```

Par défaut :
- Mot de passe admin : `admin123` (ou `ADMIN_PASSWORD` dans `.env`)
- Port : `PORT` dans `.env` (ou 3000 par défaut)

## 🔧 Déploiement Render
- Type : Web Service
- Build command : `npm install`
- Start command : `npm start`
- Variables d'env à définir : `SESSION_SECRET`, `ADMIN_PASSWORD`, (optionnel) `PORT`
- Root directory : la racine du projet (là où se trouvent `package.json` et `app.js`)

## ✨ Fonctionnalités
- Page d'accueil : sélection du rôle **Boutique**, **Livreur**, **Labo**, **Admin**.
  - **Admin** → login avec mot de passe (session via `express-session`).
  - **Boutique/Livreur/Labo** → accès direct sans mot de passe.
- **Menu latéral** pour chaque rôle, responsive (burger sur mobile).
- **Commandes** : création depuis Boutique, visualisation depuis Labo/Livreur/Admin; statut **Non traité**/ **Validé**.
- **Produits & Catégories** : CRUD minimal côté Admin (en mémoire + fichier `data/db.json`).

## ⚠️ Données
Les données sont stockées dans `data/db.json`. Sur Render (système de fichiers éphémère), ces données peuvent être
réinitialisées lors d’un redéploiement. Pour une prod durable, raccordez une base externe (Postgres/MongoDB).
