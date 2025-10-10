#!/bin/bash
set -euo pipefail

# Script d'entrée pour Render : délègue au script principal.
chmod +x ./start-script.sh
exec ./start-script.sh
