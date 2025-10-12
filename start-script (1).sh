#!/bin/bash

echo "🚀 Démarrage de l'application Orderflow..."

# Variables d'environnement
export DB_PATH="/var/data/orderflow.sqlite"
export SESSION_SECRET=${SESSION_SECRET:-"orderflow-secret-2024"}
export PORT=${PORT:-10000}
export NODE_ENV="production"

# Créer le dossier data si nécessaire
mkdir -p /var/data

# Vérifier si la base existe, sinon la créer
if [ ! -f "$DB_PATH" ]; then
    echo "📦 Initialisation de la base de données..."
    node fix-database.js
fi

echo "✅ Base de données prête"
echo "🌐 Démarrage du serveur sur le port $PORT..."

# Démarrer l'application
node app.js