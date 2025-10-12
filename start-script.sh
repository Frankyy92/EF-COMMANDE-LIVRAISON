#!/bin/bash
set -euo pipefail

echo "🚀 Démarrage de l'application Orderflow..."

# Variables d'environnement cohérentes
export DB_PATH="${DB_PATH:-/var/data/orderflow.sqlite}"
export SESSION_SECRET="${SESSION_SECRET:-orderflow-secret-2024}"
export PORT="${PORT:-10000}"
export NODE_ENV="production"

# Dossier DB
mkdir -p "$(dirname "$DB_PATH")"

# Init/répare la base ciblée
echo "📦 DB_PATH = $DB_PATH"
node fix-database-script.js

echo "✅ Base prête — lancement serveur (port $PORT)"
exec node app.js
