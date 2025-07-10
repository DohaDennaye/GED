import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

// Charger les variables d'environnement depuis le fichier .env
dotenv.config();

// Vérification : est-ce que DATABASE_URL est définie ?
if (!process.env.DATABASE_URL) {
  throw new Error(
    "❌ DATABASE_URL manquante. Vérifie que tu as bien défini cette variable dans ton fichier .env"
  );
}

export default defineConfig({
  schema: "./shared/schema.ts",  // <-- Chemin vers ton schéma
  out: "./migrations",           // <-- Dossier où seront générées les migrations
  dialect: "postgresql",         // <-- Type de base de données
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
