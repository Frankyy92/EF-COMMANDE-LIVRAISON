# Orderflow - Ready for Render

- Login **par email seul** si `SIMPLE_LOGIN=true`
- SQLite persistant via **Persistent Disk** (`DB_PATH`)
- Moteur **ejs-mate** pour `layout('layout')`

## Variables Render
- `DB_PATH=/opt/render/project/src/data/app.db`
- `SIMPLE_LOGIN=true`
- `SESSION_SECRET=<longue_chaine>`
- `ALLOWED_USERS=admin@example.com,labo@example.com,stgermain@example.com,suresnes@example.com,rueil@example.com,neuilly@example.com`
- `TZ=Europe/Paris`

## Build/Start (Render)
- Build: `npm install --no-audit --no-fund && mkdir -p /opt/render/project/src/data && node seed.js`
- Start: `npm start`

## Routes
- `/admin` (admin@example.com)
- `/labo` (labo@example.com)
- `/boutique` (stgermain/suresnes/rueil/neuilly @example.com)

