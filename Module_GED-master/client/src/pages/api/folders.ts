// pages/api/folders.ts
import type { NextApiRequest, NextApiResponse } from "next";
// Update the path below if your db file is located elsewhere
// Update the path below if your db file is located elsewhere
// Update the path below to the correct relative path if necessary
import { db } from "./../lib/db"; // <- adapte ce chemin selon ton projet
// Update the import path below to the correct location of your schema file
import { folders } from "../../lib/db/schema"; // <- adapte ce chemin aussi

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const data = await db.select().from(folders);
      res.status(200).json(data);
    } catch (error) {
      console.error("Erreur lors de la récupération des dossiers:", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  } else {
    res.status(405).json({ error: "Méthode non autorisée" });
  }
}
