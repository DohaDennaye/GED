import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("user"), // admin, user, viewer
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Folders table
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  parentId: integer("parent_id"),
  path: text("path").notNull(), // Full path for easier queries
  type: text("type").notNull().default("standard"), // standard, smart, secure
  permissions: jsonb("permissions").$type<Record<string, string[]>>().default({}),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Documents table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  originalName: text("original_name").notNull(),
  folderId: integer("folder_id").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type").notNull(),
  status: text("status").notNull().default("draft"), // draft, pending, approved, expired, cancelled
  tags: text("tags").array().default([]),
  description: text("description"),
  version: integer("version").notNull().default(1),
  isLatestVersion: boolean("is_latest_version").notNull().default(true),
  parentDocumentId: integer("parent_document_id"), // For versions
  expirationDate: timestamp("expiration_date"),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Document permissions table
export const documentPermissions = pgTable("document_permissions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  userId: integer("user_id"),
  userGroup: text("user_group"),
  permissions: text("permissions").array().notNull(), // read, write, share, delete
  createdAt: timestamp("created_at").defaultNow(),
});

// Document shares table (for external sharing)
export const documentShares = pgTable("document_shares", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull(),
  shareToken: text("share_token").notNull().unique(),
  expiresAt: timestamp("expires_at"),
  maxViews: integer("max_views"),
  currentViews: integer("current_views").notNull().default(0),
  createdBy: integer("created_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Activity log table
export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  action: text("action").notNull(), // upload, download, share, delete, etc.
  resourceType: text("resource_type").notNull(), // document, folder
  resourceId: integer("resource_id").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  folders: many(folders),
  activityLog: many(activityLog),
}));

export const foldersRelations = relations(folders, ({ one, many }) => ({
  parent: one(folders, {
    fields: [folders.parentId],
    references: [folders.id],
  }),
  children: many(folders),
  documents: many(documents),
  createdByUser: one(users, {
    fields: [folders.createdBy],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  folder: one(folders, {
    fields: [documents.folderId],
    references: [folders.id],
  }),
  createdByUser: one(users, {
    fields: [documents.createdBy],
    references: [users.id],
  }),
  parentDocument: one(documents, {
    fields: [documents.parentDocumentId],
    references: [documents.id],
  }),
  versions: many(documents),
  permissions: many(documentPermissions),
  shares: many(documentShares),
}));

export const documentPermissionsRelations = relations(documentPermissions, ({ one }) => ({
  document: one(documents, {
    fields: [documentPermissions.documentId],
    references: [documents.id],
  }),
  user: one(users, {
    fields: [documentPermissions.userId],
    references: [users.id],
  }),
}));

export const documentSharesRelations = relations(documentShares, ({ one }) => ({
  document: one(documents, {
    fields: [documentShares.documentId],
    references: [documents.id],
  }),
  createdByUser: one(users, {
    fields: [documentShares.createdBy],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
});

export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  parentId: true,
  type: true,
  permissions: true,
});

export const insertDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  originalName: true,
  folderId: true,
  fileType: true,
  fileSize: true,
  filePath: true,
  mimeType: true,
  tags: true,
  description: true,
  expirationDate: true,
});

export const updateDocumentSchema = createInsertSchema(documents).pick({
  name: true,
  folderId: true,
  tags: true,
  description: true,
  status: true,
  expirationDate: true,
}).partial();

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Folder = typeof folders.$inferSelect;
export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Document = Omit<typeof documents.$inferSelect, "createdAt" | "updatedAt" | "expirationDate"> & {
  createdAt: string;
  updatedAt: string;
  expirationDate: string | null;
};
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type UpdateDocument = z.infer<typeof updateDocumentSchema>;
export type DocumentPermission = typeof documentPermissions.$inferSelect;
export type DocumentShare = typeof documentShares.$inferSelect;
export type ActivityLog = typeof activityLog.$inferSelect;
export type DocumentWithDetails = Document & {
  createdByUser?: User;
  folder?: Folder;
};
export const schema = {
  users,
  folders,
  documents,
  documentPermissions,
  documentShares,
  activityLog,

  insertUserSchema,
  insertFolderSchema,
  insertDocumentSchema,
  updateDocumentSchema,
};
