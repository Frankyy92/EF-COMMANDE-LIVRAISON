import express from "express";
import cors from "cors";
import pg from "pg";

const app = express();
app.use(express.json());
app.use(cors({ origin: ["https://ef-commande-livraison-5.onrender.com"] })); // ton domaine static site

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // utile sur Render Postgres managée
});

// Route santé (et HEAD support)
app.get("/", (req, res) => res.status(200).send("OK"));
app.head("/", (req, res) => res.status(200).end());

// Exemple de table pour l’historique
// CREATE TABLE IF NOT EXISTS history (
//   id SERIAL PRIMARY KEY,
//   created_at TIMESTAMPTZ DEFAULT now(),
//   action TEXT NOT NULL,
//   payload JSONB
// );

// Enregistrer un évènement d’historique
app.post("/api/history", async (req, res) => {
  const { action, payload } = req.body || {};
  if (!action) return res.status(400).json({ error: "action is required" });
  const { rows } = await pool.query(
    "INSERT INTO history(action, payload) VALUES ($1, $2) RETURNING *",
    [action, payload || {}]
  );
  res.json(rows[0]);
});

// Lister l’historique
app.get("/api/history", async (_req, res) => {
  const { rows } = await pool.query(
    "SELECT * FROM history ORDER BY created_at DESC LIMIT 200"
  );
  res.json(rows);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API listening on ${PORT}`);
});
