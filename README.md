# Orderflow Application

Cette application web permet de gérer les commandes internes entre un laboratoire de production et un réseau de boutiques (pâtisserie/traiteur).  
Elle a été conçue pour être utilisée uniquement en interne et reste accessible depuis un navigateur web sur ordinateur ou tablette.

## Fonctions principales

- **Prise de commande boutique (J+1)** : chaque boutique saisit les quantités souhaitées pour le lendemain. L’interface propose des suggestions automatiques basées sur l’historique des ventes (même jour de semaine) afin de gagner du temps.
- **Consolidation au labo** : le laboratoire visualise toutes les commandes du jour, ajuste les quantités si nécessaire puis verrouille la production.
- **Plans de production et de livraison** : après verrouillage, l’application génère automatiquement deux PDF : le plan de production (quantités globales à produire) et le plan de livraison (répartition par tournée/boutique).
- **Gestion des références** : un administrateur peut gérer les produits, catégories, boutiques et comptes utilisateurs.

## Installation

1. **Prérequis** :
   - Node.js ≥ 16 et npm
   - (optionnel) Docker pour un déploiement simplifié
   - Un système GNU/Linux ou macOS configuré avec le fuseau horaire Europe/Paris
2. **Cloner le dépôt** ou copier ce dossier sur votre machine.
3. Rendez‑vous dans le dossier du projet :

```bash
cd orderflow-app
```

4. Installez les dépendances :

```bash
npm install
```

5. Copiez le fichier `.env.example` vers `.env` et personnalisez la variable `SESSION_SECRET` :

```bash
cp .env.example .env
nano .env
```

6. Initialisez la base de données et des données de démonstration :

```bash
npm run seed
```

7. Lancez l’application :

```bash
npm start
```

Par défaut, l’application écoute sur le port **3000**. Rendez‑vous sur <http://localhost:3000> dans votre navigateur.

### Utilisation avec Docker

Si vous souhaitez lancer l’application via Docker :

```bash
docker build -t orderflow-app .
docker run -p 3000:3000 --env-file .env orderflow-app
```

Les données sont stockées dans `data/app.db`. Pour les conserver entre les redémarrages, montez un volume Docker ou copiez ce fichier.

## Comptes de démonstration

Des utilisateurs de test sont créés par le script de seed :

| Rôle        | Identifiant                | Mot de passe   |
|-------------|----------------------------|----------------|
| Administrateur | admin@example.com          | admin123       |
| Labo        | labo@example.com           | labo123        |
| Boutique A  | stgermain@example.com      | boutique123    |
| Boutique B  | suresnes@example.com       | boutique123    |
| Boutique C  | rueil@example.com          | boutique123    |
| Boutique D  | neuilly@example.com        | boutique123    |

## Structure de l’application

- `app.js` : point d’entrée. Configure Express, la session, la base SQLite et charge les routes.
- `db.js` : initialisation de la base et des tables.
- `routes/` : contient les routes séparées par rôle (authentification, boutique, labo, administration).
- `views/` : templates EJS. Le layout principal est dans `views/layout.ejs`. Les couleurs principales (crème et marron chocolat) sont définies dans le fichier CSS `public/css/style.css`.
- `scripts/seed.js` : crée la base, insère des catégories, produits, boutiques et utilisateurs de démonstration.
- `data/` : dossier où se trouve la base SQLite (`app.db`).
- `public/` : ressources statiques (feuilles de style, images, etc.).

## Personnalisation de l’apparence

La palette de couleurs utilise un fond crème (#F5F5DC) et des accents marron chocolat (#5D4037). Vous pouvez adapter ces couleurs en modifiant le fichier `public/css/style.css`.

Pour ajouter votre logo et votre charte, placez votre image dans `public/img/` puis référez‑vous à ce fichier dans le layout EJS (`views/layout.ejs`).

## Fonctionnement

1. **Connexion** : l’utilisateur se connecte via `/login` en fournissant son email et son mot de passe.
2. En fonction de son rôle, il est redirigé vers :
   - `/admin` pour l’administration
   - `/labo` pour la consolidation des commandes
   - `/boutique` pour la saisie des commandes
3. **Saisie de commande** :
   - La boutique choisit les quantités pour chaque produit.
   - La saisie est possible jusqu’à l’heure de **cut‑off (21:00)**. Après cet horaire, les commandes sont gelées.
   - L’historique des ventes de la boutique (même jour de semaine) est utilisé pour proposer une quantité automatique. Les suggestions apparaissent dans les champs de quantité.
4. **Consolidation** :
   - Le Labo consulte les commandes de toutes les boutiques.
   - Il ajuste les quantités finales si nécessaire, puis verrouille la commande du jour.
   - Le verrouillage déclenche la génération automatique de deux PDF :
     - **Plan de production** : quantités globales à produire par produit.
     - **Plan de livraison** : détail des quantités à livrer par tournée/boutique.

## Licence

Ce projet est fourni à titre d’exemple et peut être utilisé et adapté librement dans un contexte professionnel.