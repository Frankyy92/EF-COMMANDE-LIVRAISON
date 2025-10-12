#!/bin/bash

# start-script.sh
# Script de démarrage de l'application en production (Render, etc.)

set -e

echo "🚀 Démarrage de l'application Orderflow..."

# Variables d'environnement avec valeurs par défaut
export DB_PATH="${DB_PATH:-/var/data/orderflow.sqlite}"
export SESSION_SECRET="${SESSION_SECRET:-orderflow-secret-2024}"
export PORT="${PORT:-10000}"
export NODE_ENV="production"

# Créer le dossier data si nécessaire
mkdir -p "$(dirname "$DB_PATH")"

# Initialiser / réparer la base (idempotent)
echo "🛠️  Vérification/initialisation de la base de données ($DB_PATH)..."
node fix-database-script.js

echo "✅ Base prête"
echo "🌐 Lancement du serveur (port $PORT)..."
exec node app.js
