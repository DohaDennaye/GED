import {
  users,
  documents,
  documentPermissions,
  documentShares,
  activityLog,
  type User,
  type InsertUser,
  type Folder,
  type InsertFolder,
  type Document,
  type InsertDocument,
  type UpdateDocument,
  type DocumentPermission,
  type DocumentShare,
  type ActivityLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, like, desc, asc, sql, inArray } from "drizzle-orm";
import { folders } from "@shared/schema";
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Folder operations
  getFolders(): Promise<Folder[]>;
  getFolderById(id: number): Promise<Folder | undefined>;
  getFoldersByParent(parentId: number | null): Promise<Folder[]>;
  createFolder(folder: Omit<InsertFolder, 'path'> & { createdBy: number }): Promise<Folder>;
  updateFolder(id: number, folder: Partial<Folder>): Promise<Folder>;
  deleteFolder(id: number): Promise<void>;

  // Document operations
  getDocuments(folderId?: number): Promise<(Document & { createdByUser: User; folder: Folder })[]>;
  getDocumentById(id: number): Promise<(Document & { createdByUser: User; folder: Folder }) | undefined>;
  searchDocuments(query: string, filters?: {
    fileType?: string;
    status?: string;
    createdBy?: number;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<(Document & { createdByUser: User; folder: Folder })[]>;
  createDocument(document: InsertDocument & { createdBy: number }): Promise<Document>;
  updateDocument(id: number, document: UpdateDocument): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // Activity log
  logActivity(userId: number, action: string, resourceType: string, resourceId: number, metadata?: Record<string, any>): Promise<void>;
  getRecentActivity(limit?: number): Promise<(ActivityLog & { user: User })[]>;

  // Statistics
  getDocumentStats(): Promise<{
    totalDocuments: number;
    expiringDocuments: number;
    pendingDocuments: number;
    totalStorage: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getFolders(): Promise<Folder[]> {
    try {
      const result = await db.select().from(folders).orderBy(asc(folders.path));
      console.log("Fetched folders:", result);
      return result;
    } catch (error) {
      console.error("Erreur dans getFolders:", error);
      throw error;
    }
  }

  async getFolderById(id: number): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }

  async getFoldersByParent(parentId: number | null): Promise<Folder[]> {
    const condition = parentId === null ? sql`${folders.parentId} IS NULL` : eq(folders.parentId, parentId);
    return await db.select().from(folders).where(condition).orderBy(asc(folders.name));
  }

  async createFolder(folder: Omit<InsertFolder, 'path'> & { createdBy: number }): Promise<Folder> {
    const path = folder.parentId
      ? `${(await this.getFolderById(folder.parentId))?.path}/${folder.name}`
      : folder.name;

    // Use raw SQL to avoid typing issues
    const result = await db.execute(sql`
      INSERT INTO folders (name, parent_id, path, type, permissions, created_by, created_at, updated_at)
      VALUES (${folder.name}, ${folder.parentId}, ${path}, ${folder.type || 'standard'}, ${JSON.stringify(folder.permissions || {})}, ${folder.createdBy}, NOW(), NOW())
      RETURNING *
    `);

    return result.rows[0] as any;
  }

  async updateFolder(id: number, folder: Partial<Folder>): Promise<Folder> {
    const [updatedFolder] = await db
      .update(folders)
      .set({ ...folder, updatedAt: new Date() })
      .where(eq(folders.id, id))
      .returning();
    return updatedFolder;
  }

  async deleteFolder(id: number): Promise<void> {
    await db.delete(folders).where(eq(folders.id, id));
  }

  async getDocuments(folderId?: number): Promise<(Document & { createdByUser: User; folder: Folder })[]> {
    const query = db
      .select({
        id: documents.id,
        name: documents.name,
        originalName: documents.originalName,
        folderId: documents.folderId,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        filePath: documents.filePath,
        mimeType: documents.mimeType,
        status: documents.status,
        tags: documents.tags,
        description: documents.description,
        version: documents.version,
        isLatestVersion: documents.isLatestVersion,
        parentDocumentId: documents.parentDocumentId,
        expirationDate: documents.expirationDate,
        createdBy: documents.createdBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        createdByUser: users,
        folder: folders,
      })
      .from(documents)
      .innerJoin(users, eq(documents.createdBy, users.id))
      .innerJoin(folders, eq(documents.folderId, folders.id))
      .where(and(
        eq(documents.isLatestVersion, true),
        folderId ? eq(documents.folderId, folderId) : undefined
      ))
      .orderBy(desc(documents.createdAt));

    const results = await query;
    return results.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : "",
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : "",
      expirationDate: doc.expirationDate ? doc.expirationDate.toISOString() : null,
    }));
  }

  async getDocumentById(id: number): Promise<(Document & { createdByUser: User; folder: Folder }) | undefined> {
    const [document] = await db
      .select({
        id: documents.id,
        name: documents.name,
        originalName: documents.originalName,
        folderId: documents.folderId,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        filePath: documents.filePath,
        mimeType: documents.mimeType,
        status: documents.status,
        tags: documents.tags,
        description: documents.description,
        version: documents.version,
        isLatestVersion: documents.isLatestVersion,
        parentDocumentId: documents.parentDocumentId,
        expirationDate: documents.expirationDate,
        createdBy: documents.createdBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        createdByUser: users,
        folder: folders,
      })
      .from(documents)
      .innerJoin(users, eq(documents.createdBy, users.id))
      .innerJoin(folders, eq(documents.folderId, folders.id))
      .where(eq(documents.id, id));

    return document
      ? {
        ...document,
        createdAt: document.createdAt ? document.createdAt.toISOString() : "",
        updatedAt: document.updatedAt ? document.updatedAt.toISOString() : "",
        expirationDate: document.expirationDate ? document.expirationDate.toISOString() : null,
      }
      : undefined;
  }

  async searchDocuments(query: string, filters?: {
    fileType?: string;
    status?: string;
    createdBy?: number;
    tags?: string[];
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<(Document & { createdByUser: User; folder: Folder })[]> {
    const conditions = [
      eq(documents.isLatestVersion, true),
      or(
        like(documents.name, `%${query}%`),
        like(documents.originalName, `%${query}%`),
        like(documents.description, `%${query}%`)
      )
    ];

    if (filters?.fileType) {
      conditions.push(eq(documents.fileType, filters.fileType));
    }
    if (filters?.status) {
      conditions.push(eq(documents.status, filters.status));
    }
    if (filters?.createdBy) {
      conditions.push(eq(documents.createdBy, filters.createdBy));
    }
    if (filters?.dateFrom) {
      conditions.push(sql`${documents.createdAt} >= ${filters.dateFrom}`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${documents.createdAt} <= ${filters.dateTo}`);
    }

    const results = await db
      .select({
        id: documents.id,
        name: documents.name,
        originalName: documents.originalName,
        folderId: documents.folderId,
        fileType: documents.fileType,
        fileSize: documents.fileSize,
        filePath: documents.filePath,
        mimeType: documents.mimeType,
        status: documents.status,
        tags: documents.tags,
        description: documents.description,
        version: documents.version,
        isLatestVersion: documents.isLatestVersion,
        parentDocumentId: documents.parentDocumentId,
        expirationDate: documents.expirationDate,
        createdBy: documents.createdBy,
        createdAt: documents.createdAt,
        updatedAt: documents.updatedAt,
        createdByUser: users,
        folder: folders,
      })
      .from(documents)
      .innerJoin(users, eq(documents.createdBy, users.id))
      .innerJoin(folders, eq(documents.folderId, folders.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt));

    return results.map((doc) => ({
      ...doc,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : "",
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : "",
      expirationDate: doc.expirationDate ? doc.expirationDate.toISOString() : null,
    }));
  }

  async createDocument(document: InsertDocument & { createdBy: number }): Promise<Document> {
    const [newDocument] = await db
      .insert(documents)
      .values(document)
      .returning();
    return {
      ...newDocument,
      createdAt: newDocument.createdAt ? newDocument.createdAt.toISOString() : "",
      updatedAt: newDocument.updatedAt ? newDocument.updatedAt.toISOString() : "",
      expirationDate: newDocument.expirationDate ? newDocument.expirationDate.toISOString() : null,
    };
  }

  async updateDocument(id: number, document: UpdateDocument): Promise<Document> {
    const [updatedDocument] = await db
      .update(documents)
      .set({ ...document, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return {
      ...updatedDocument,
      createdAt: updatedDocument.createdAt ? updatedDocument.createdAt.toISOString() : "",
      updatedAt: updatedDocument.updatedAt ? updatedDocument.updatedAt.toISOString() : "",
      expirationDate: updatedDocument.expirationDate ? updatedDocument.expirationDate.toISOString() : null,
    };
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  async logActivity(userId: number, action: string, resourceType: string, resourceId: number, metadata?: Record<string, any>): Promise<void> {
    await db.insert(activityLog).values({
      userId,
      action,
      resourceType,
      resourceId,
      metadata: metadata || {},
    });
  }

  async getRecentActivity(limit = 50): Promise<(ActivityLog & { user: User })[]> {
    return await db
      .select({
        id: activityLog.id,
        userId: activityLog.userId,
        action: activityLog.action,
        resourceType: activityLog.resourceType,
        resourceId: activityLog.resourceId,
        metadata: activityLog.metadata,
        createdAt: activityLog.createdAt,
        user: users,
      })
      .from(activityLog)
      .innerJoin(users, eq(activityLog.userId, users.id))
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  async getDocumentStats(): Promise<{
    totalDocuments: number;
    expiringDocuments: number;
    pendingDocuments: number;
    totalStorage: number;
  }> {
    const [stats] = await db
      .select({
        totalDocuments: sql<number>`count(*)`,
        expiringDocuments: sql<number>`count(*) filter (where ${documents.expirationDate} <= ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)})`,
        pendingDocuments: sql<number>`count(*) filter (where ${documents.status} = 'pending')`,
        totalStorage: sql<number>`sum(${documents.fileSize})`,
      })
      .from(documents)
      .where(eq(documents.isLatestVersion, true));

    return {
      totalDocuments: stats.totalDocuments || 0,
      expiringDocuments: stats.expiringDocuments || 0,
      pendingDocuments: stats.pendingDocuments || 0,
      totalStorage: stats.totalStorage || 0,
    };
  }
}

export const storage = new DatabaseStorage();
