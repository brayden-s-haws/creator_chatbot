import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Articles table to store RSS content
export const articles = pgTable("articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull().unique(),
  content: text("content").notNull(),
  publishedAt: timestamp("published_at").notNull(),
  fetchedAt: timestamp("fetched_at").notNull().defaultNow(),
  guid: text("guid").notNull().unique(),
});

// Content chunks table for storing article segments
export const contentChunks = pgTable("content_chunks", {
  id: serial("id").primaryKey(),
  articleId: integer("article_id").notNull().references(() => articles.id),
  content: text("content").notNull(),
  embedding: jsonb("embedding"),
});

// Queries log to track user interactions
export const queries = pgTable("queries", {
  id: serial("id").primaryKey(),
  query: text("query").notNull(),
  embedding: jsonb("embedding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Vector store table for persistent storage of embeddings
export const vectorDocuments = pgTable("vector_documents", {
  id: serial("id").primaryKey(),
  documentId: text("document_id").notNull().unique(),
  content: text("content").notNull(),
  embedding: jsonb("embedding").notNull(),
  articleId: integer("article_id").notNull().references(() => articles.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema for inserting a new article
export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  fetchedAt: true,
});

// Schema for inserting a new content chunk
export const insertContentChunkSchema = createInsertSchema(contentChunks).omit({
  id: true,
});

// Schema for inserting a new query
export const insertQuerySchema = createInsertSchema(queries).omit({
  id: true,
  createdAt: true,
});

// Schema for inserting a new vector document
export const insertVectorDocumentSchema = createInsertSchema(vectorDocuments).omit({
  id: true,
  createdAt: true,
});

// Types based on the schemas
export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

export type InsertContentChunk = z.infer<typeof insertContentChunkSchema>;
export type ContentChunk = typeof contentChunks.$inferSelect;

export type InsertQuery = z.infer<typeof insertQuerySchema>;
export type Query = typeof queries.$inferSelect;

export type InsertVectorDocument = z.infer<typeof insertVectorDocumentSchema>;
export type VectorDocument = typeof vectorDocuments.$inferSelect;

// Source citation type
export type SourceCitation = {
  title: string;
  url: string;
};

// Message type for chat interface
export type MessageType = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  sources: SourceCitation[];
  isGeneralKnowledge?: boolean;
};

// System status type
export type SystemStatusType = {
  dbConnected: boolean;
  lastUpdated: string | null;
  nextUpdate: string | null;
  articlesIndexed: number;
};
