import fs from "fs/promises";
import path from "path";
import { Article, ContentChunk, Query, InsertArticle, InsertContentChunk, InsertQuery, SystemStatusType } from "@shared/schema";
import { db } from "./db";
import { eq, sql, desc } from "drizzle-orm";
import { articles, contentChunks, queries } from "@shared/schema";
import { testDatabaseConnection } from "./db";
import { log } from "./vite";

// Interface for storage operations
export interface IStorage {
  // Article operations
  getArticles(): Promise<Article[]>;
  getArticleById(id: number): Promise<Article | undefined>;
  getArticleByUrl(url: string): Promise<Article | undefined>;
  getArticleByGuid(guid: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  
  // Content chunk operations
  getContentChunks(): Promise<ContentChunk[]>;
  getContentChunksByArticleId(articleId: number): Promise<ContentChunk[]>;
  createContentChunk(chunk: InsertContentChunk): Promise<ContentChunk>;
  
  // Query operations
  getQueries(): Promise<Query[]>;
  createQuery(query: InsertQuery): Promise<Query>;
  
  // System status operations
  getSystemStatus(): Promise<SystemStatusType>;
  updateSystemStatus(status: Partial<SystemStatusType>): Promise<SystemStatusType>;
  
  // Persistence operations
  saveToFile(): Promise<void>;
  loadFromFile(): Promise<void>;
}

// Implement storage with PostgreSQL database
export class DatabaseStorage implements IStorage {
  private systemStatus: SystemStatusType;
  private dataDir: string;
  
  constructor() {
    this.systemStatus = {
      dbConnected: false,
      lastUpdated: null,
      nextUpdate: null,
      articlesIndexed: 0,
    };
    
    this.dataDir = path.join(process.cwd(), "data");
    
    // Initialize the database connection
    this.initializeDatabase();
  }
  
  private async initializeDatabase(): Promise<void> {
    try {
      // Test database connection
      const connected = await testDatabaseConnection();
      this.systemStatus.dbConnected = connected;
      
      if (connected) {
        // Get article count
        const result = await db.select({ count: sql<number>`count(*)` }).from(articles);
        this.systemStatus.articlesIndexed = result[0].count;
        
        log("Database initialized successfully", "storage");
      }
    } catch (error: any) {
      log(`Database initialization failed: ${error.message}`, "storage");
      this.systemStatus.dbConnected = false;
    }
  }
  
  // Article operations
  async getArticles(): Promise<Article[]> {
    return await db.select().from(articles).orderBy(desc(articles.publishedAt));
  }
  
  async getArticleById(id: number): Promise<Article | undefined> {
    const result = await db.select().from(articles).where(eq(articles.id, id));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    const result = await db.select().from(articles).where(eq(articles.url, url));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async getArticleByGuid(guid: string): Promise<Article | undefined> {
    const result = await db.select().from(articles).where(eq(articles.guid, guid));
    return result.length > 0 ? result[0] : undefined;
  }
  
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db.insert(articles)
      .values({ ...insertArticle, fetchedAt: new Date() })
      .returning();
    
    // Update system status
    this.systemStatus.lastUpdated = new Date().toISOString();
    this.systemStatus.articlesIndexed += 1;
    
    return article;
  }
  
  // Content chunk operations
  async getContentChunks(): Promise<ContentChunk[]> {
    return await db.select().from(contentChunks);
  }
  
  async getContentChunksByArticleId(articleId: number): Promise<ContentChunk[]> {
    return await db.select().from(contentChunks).where(eq(contentChunks.articleId, articleId));
  }
  
  async createContentChunk(insertChunk: InsertContentChunk): Promise<ContentChunk> {
    const [chunk] = await db.insert(contentChunks).values(insertChunk).returning();
    return chunk;
  }
  
  // Query operations
  async getQueries(): Promise<Query[]> {
    return await db.select().from(queries).orderBy(desc(queries.createdAt));
  }
  
  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const [query] = await db.insert(queries)
      .values({ ...insertQuery, createdAt: new Date() })
      .returning();
    
    return query;
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatusType> {
    // Refresh article count
    const result = await db.select({ count: sql<number>`count(*)` }).from(articles);
    this.systemStatus.articlesIndexed = result[0].count;
    
    return this.systemStatus;
  }
  
  async updateSystemStatus(status: Partial<SystemStatusType>): Promise<SystemStatusType> {
    this.systemStatus = { ...this.systemStatus, ...status };
    await this.saveToFile();
    return this.systemStatus;
  }
  
  // Persistence operations - still keeping file backups for system status
  async saveToFile(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Serialize system status
      await fs.writeFile(
        path.join(this.dataDir, "system-status.json"),
        JSON.stringify(this.systemStatus, null, 2)
      );
      
    } catch (error: any) {
      console.error("Failed to save system status to file:", error);
    }
  }
  
  async loadFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, "system-status.json");
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, nothing to load
        return;
      }
      
      // Read and parse system status
      const content = await fs.readFile(filePath, "utf-8");
      this.systemStatus = JSON.parse(content);
      
      log("Loaded system status from file", "storage");
    } catch (error: any) {
      log(`Failed to load system status from file: ${error.message}`, "storage");
    }
  }
}

// Create and initialize storage
export const storage = new DatabaseStorage();

// Load data from file on startup
(async () => {
  await storage.loadFromFile();
})();
