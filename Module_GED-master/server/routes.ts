import { Express ,Router} from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFolderSchema, insertDocumentSchema, updateDocumentSchema, folders } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db } from "./db";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const router = Router();
router.get("/", async (req, res) => {
  try {
    const allFolders = await db.select().from(folders);
    res.json(allFolders);
  } catch (error) {
    console.error("Erreur de lecture des folders :", error);
    res.status(500).json({ error: "Erreur de lecture des folders" });
  }
});
export default router;
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Mock user ID for development (in production, this would come from authentication)
  const getCurrentUserId = () => 1;

  // Create default user and folders
  try {
    const existingUser = await storage.getUserByUsername("admin");
    if (!existingUser) {
      await storage.createUser({
        username: "admin",
        email: "admin@example.com",
        firstName: "Admin",
        lastName: "User",
        role: "admin",
      });

      // Create default folder structure
      const comptabiliteFolder = await storage.createFolder({
        name: "Comptabilité",
        parentId: null,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "Factures",
        parentId: comptabiliteFolder.id,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "Devis",
        parentId: comptabiliteFolder.id,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "Ressources Humaines",
        parentId: null,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "Achats",
        parentId: null,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      const projetsFolder = await storage.createFolder({
        name: "Projets Import",
        parentId: null,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "DUM",
        parentId: projetsFolder.id,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });

      await storage.createFolder({
        name: "Quittances",
        parentId: projetsFolder.id,
        type: "standard",
        permissions: {},
        createdBy: 1,
      });
    }
  } catch (error) {
    console.error("Error creating default data:", error);
  }

  // Folder routes
  app.get("/api/folders", async (req, res) => {
    try {
      const folders = await storage.getFolders();
      console.log("Dossiers récupérés :", folders);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folders:", error);
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.get("/api/folders/:parentId/children", async (req, res) => {
    try {
      const parentId = req.params.parentId === 'null' ? null : parseInt(req.params.parentId);
      const folders = await storage.getFoldersByParent(parentId);
      res.json(folders);
    } catch (error) {
      console.error("Error fetching folder children:", error);
      res.status(500).json({ message: "Failed to fetch folder children" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      const folderData = insertFolderSchema.parse(req.body);
      const folder = await storage.createFolder({
        ...folderData,
        createdBy: getCurrentUserId(),
      });
      await storage.logActivity(getCurrentUserId(), "create_folder", "folder", folder.id);
      res.json(folder);
    } catch (error) {
      console.error("Error creating folder:", error);
      res.status(500).json({ message: "Failed to create folder" });
    }
  });

  // Document routes
  app.get("/api/documents", async (req, res) => {
    try {
      const folderId = req.query.folderId ? parseInt(req.query.folderId as string) : undefined;
      const documents = await storage.getDocuments(folderId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.get("/api/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      const filters = {
        fileType: req.query.fileType as string,
        status: req.query.status as string,
        createdBy: req.query.createdBy ? parseInt(req.query.createdBy as string) : undefined,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
      };

      const documents = await storage.searchDocuments(query, filters);
      res.json(documents);
    } catch (error) {
      console.error("Error searching documents:", error);
      res.status(500).json({ message: "Failed to search documents" });
    }
  });

  app.post("/api/documents/upload", upload.array('files'), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const folderId = parseInt(req.body.folderId);
      const tags = req.body.tags ? req.body.tags.split(',').map((tag: string) => tag.trim()) : [];

      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedDocuments = [];

      for (const file of files) {
        const documentData = {
          name: file.originalname,
          originalName: file.originalname,
          folderId,
          fileType: path.extname(file.originalname).substring(1).toLowerCase(),
          fileSize: file.size,
          filePath: file.path,
          mimeType: file.mimetype,
          tags,
          createdBy: getCurrentUserId(),
        };

        const document = await storage.createDocument(documentData);
        await storage.logActivity(getCurrentUserId(), "upload_document", "document", document.id);
        uploadedDocuments.push(document);
      }

      res.json(uploadedDocuments);
    } catch (error) {
      console.error("Error uploading documents:", error);
      res.status(500).json({ message: "Failed to upload documents" });
    }
  });

  app.put("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const documentData = updateDocumentSchema.parse(req.body);
      const document = await storage.updateDocument(id, documentData);
      await storage.logActivity(getCurrentUserId(), "update_document", "document", id);
      res.json(document);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Delete file from filesystem
      try {
        fs.unlinkSync(document.filePath);
      } catch (err) {
        console.error("Error deleting file:", err);
      }

      await storage.deleteDocument(id);
      await storage.logActivity(getCurrentUserId(), "delete_document", "document", id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const document = await storage.getDocumentById(id);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      await storage.logActivity(getCurrentUserId(), "download_document", "document", id);
      res.download(document.filePath, document.originalName);
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // Statistics route
  app.get("/api/stats", async (req, res) => {
    try {
      const stats = await storage.getDocumentStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Activity log route
  app.get("/api/activity", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const activities = await storage.getRecentActivity(limit);
      res.json(activities);
    } catch (error) {
      console.error("Error fetching activity:", error);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // Modern document features
  app.post("/api/documents/:id/favorite", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.logActivity(getCurrentUserId(), "favorite_document", "document", id);
      res.json({ success: true, message: "Document favorite status updated" });
    } catch (error) {
      console.error("Error updating favorite status:", error);
      res.status(500).json({ message: "Failed to update favorite status" });
    }
  });

  app.post("/api/documents/:id/share", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { expiresIn } = req.body;

      const shareToken = Math.random().toString(36).substring(2, 15);
      const shareUrl = `${req.protocol}://${req.get('host')}/share/${shareToken}`;

      await storage.logActivity(getCurrentUserId(), "share_document", "document", id, {
        shareToken,
        expiresIn,
        shareUrl
      });

      res.json({
        success: true,
        shareUrl,
        message: "Share link created successfully"
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      res.status(500).json({ message: "Failed to create share link" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
