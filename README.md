# Orderflow Project v2 (multi-boutiques)

Cette version garde l'ergonomie modernisée mais réintroduit la logique **multi-boutiques** (Neuilly, Saint-Germain, Suresnes, Rueil)
ainsi que des vues Labo et Livreur adaptées. Elle ajoute aussi un import CSV optionnel (matrice livraison).

## Démarrer
```bash
npm install
cp .env.example .env
npm start
```

## Multi-boutiques
- Page Boutique -> sélection de la boutique -> page de commande par **date** (par ex. /boutique/neuilly/2025-10-09)
- Labo -> vue groupée par date puis par boutique
- Livreur -> vue groupée par boutique (commandes validées)

## Import CSV (Matrice livraison)
- Admin -> Import CSV : envoyez un fichier CSV avec colonnes :
  date, boutique, categorie, produit, prix, quantite (suggestion facultative)
