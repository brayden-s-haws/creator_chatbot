
import { eq } from 'drizzle-orm';
import { Article, ContentChunk, Query, InsertArticle, InsertContentChunk, InsertQuery, SystemStatusType } from "../shared/schema";
import { getDb } from './db';
import * as schema from '../shared/schema';

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
}

export class PostgresStorage implements IStorage {
  
  // Article operations
  async getArticles(): Promise<Article[]> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(schema.articles);
  }
  
  async getArticleById(id: number): Promise<Article | undefined> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.select().from(schema.articles).where(eq(schema.articles.id, id));
    return result[0];
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.select().from(schema.articles).where(eq(schema.articles.url, url));
    return result[0];
  }
  
  async getArticleByGuid(guid: string): Promise<Article | undefined> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.select().from(schema.articles).where(eq(schema.articles.guid, guid));
    return result[0];
  }
  
  async createArticle(article: InsertArticle): Promise<Article> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.insert(schema.articles).values(article).returning();
    await this.updateSystemStatus({ 
      lastUpdated: new Date().toISOString(), 
      articlesIndexed: (await this.getArticles()).length 
    });
    return result[0];
  }
  
  // Content chunk operations
  async getContentChunks(): Promise<ContentChunk[]> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(schema.contentChunks);
  }
  
  async getContentChunksByArticleId(articleId: number): Promise<ContentChunk[]> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(schema.contentChunks).where(eq(schema.contentChunks.articleId, articleId));
  }
  
  async createContentChunk(chunk: InsertContentChunk): Promise<ContentChunk> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.insert(schema.contentChunks).values(chunk).returning();
    return result[0];
  }
  
  // Query operations
  async getQueries(): Promise<Query[]> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    return await db.select().from(schema.queries);
  }
  
  async createQuery(query: InsertQuery): Promise<Query> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.insert(schema.queries).values(query).returning();
    return result[0];
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatusType> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    const result = await db.select().from(schema.systemStatus);
    
    if (result.length === 0) {
      // Create initial status if it doesn't exist
      const newStatus = {
        dbConnected: true,
        lastUpdated: null,
        nextUpdate: null,
        articlesIndexed: 0
      };
      await db.insert(schema.systemStatus).values(newStatus);
      return newStatus;
    }
    
    return {
      dbConnected: result[0].dbConnected,
      lastUpdated: result[0].lastUpdated ? result[0].lastUpdated.toISOString() : null,
      nextUpdate: result[0].nextUpdate ? result[0].nextUpdate.toISOString() : null,
      articlesIndexed: result[0].articlesIndexed
    };
  }
  
  async updateSystemStatus(status: Partial<SystemStatusType>): Promise<SystemStatusType> {
    const db = getDb();
    if (!db) throw new Error("Database not initialized");
    
    // Convert string dates to Date objects if they exist
    const dbStatus: any = { ...status };
    if (status.lastUpdated) dbStatus.lastUpdated = new Date(status.lastUpdated);
    if (status.nextUpdate) dbStatus.nextUpdate = new Date(status.nextUpdate);
    
    const currentStatus = await db.select().from(schema.systemStatus);
    
    if (currentStatus.length === 0) {
      // Create initial record
      const fullStatus = {
        dbConnected: status.dbConnected ?? true,
        lastUpdated: dbStatus.lastUpdated ?? null,
        nextUpdate: dbStatus.nextUpdate ?? null,
        articlesIndexed: status.articlesIndexed ?? 0
      };
      await db.insert(schema.systemStatus).values(fullStatus);
      
      return {
        ...fullStatus,
        lastUpdated: fullStatus.lastUpdated ? fullStatus.lastUpdated.toISOString() : null,
        nextUpdate: fullStatus.nextUpdate ? fullStatus.nextUpdate.toISOString() : null,
      };
    }
    
    // Update existing record
    await db.update(schema.systemStatus)
      .set(dbStatus)
      .where(eq(schema.systemStatus.id, currentStatus[0].id));
    
    // Get updated status
    const updated = await db.select().from(schema.systemStatus).where(eq(schema.systemStatus.id, currentStatus[0].id));
    
    return {
      dbConnected: updated[0].dbConnected,
      lastUpdated: updated[0].lastUpdated ? updated[0].lastUpdated.toISOString() : null,
      nextUpdate: updated[0].nextUpdate ? updated[0].nextUpdate.toISOString() : null,
      articlesIndexed: updated[0].articlesIndexed
    };
  }
}

// Fallback to file-based storage when database is not available
import { MemStorage } from './file-persister';

// Create a hybrid storage that tries PostgreSQL first, then falls back to file storage
class HybridStorage implements IStorage {
  private pgStorage: PostgresStorage;
  private fileStorage: MemStorage;
  private useDb: boolean;
  
  constructor() {
    this.pgStorage = new PostgresStorage();
    this.fileStorage = new MemStorage();
    this.useDb = !!process.env.DATABASE_URL;
  }
  
  private getStorage(): IStorage {
    return this.useDb ? this.pgStorage : this.fileStorage;
  }
  
  // Implement IStorage methods by delegating to the appropriate storage
  
  async getArticles(): Promise<Article[]> {
    return this.getStorage().getArticles();
  }
  
  async getArticleById(id: number): Promise<Article | undefined> {
    return this.getStorage().getArticleById(id);
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return this.getStorage().getArticleByUrl(url);
  }
  
  async getArticleByGuid(guid: string): Promise<Article | undefined> {
    return this.getStorage().getArticleByGuid(guid);
  }
  
  async createArticle(article: InsertArticle): Promise<Article> {
    return this.getStorage().createArticle(article);
  }
  
  async getContentChunks(): Promise<ContentChunk[]> {
    return this.getStorage().getContentChunks();
  }
  
  async getContentChunksByArticleId(articleId: number): Promise<ContentChunk[]> {
    return this.getStorage().getContentChunksByArticleId(articleId);
  }
  
  async createContentChunk(chunk: InsertContentChunk): Promise<ContentChunk> {
    return this.getStorage().createContentChunk(chunk);
  }
  
  async getQueries(): Promise<Query[]> {
    return this.getStorage().getQueries();
  }
  
  async createQuery(query: InsertQuery): Promise<Query> {
    return this.getStorage().createQuery(query);
  }
  
  async getSystemStatus(): Promise<SystemStatusType> {
    return this.getStorage().getSystemStatus();
  }
  
  async updateSystemStatus(status: Partial<SystemStatusType>): Promise<SystemStatusType> {
    return this.getStorage().updateSystemStatus(status);
  }
}

// Move original MemStorage to a separate file
export { MemStorage } from './file-persister';

// Export a unified storage interface
export const storage = new HybridStorage();
