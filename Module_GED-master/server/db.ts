import dotenv from "dotenv";
dotenv.config(); 
import pkg from 'pg';
const { Pool } = pkg;
import { drizzle } from 'drizzle-orm/node-postgres'; 
import { schema, folders } from '../shared/schema';

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
(async () => {
  try {
    const result = await db.select().from(folders);
    console.log("Résultat de la table folders :", result);
  } catch (err) {
    console.error("Erreur de lecture de folders :", err);
    process.exit(1);
  }
})();