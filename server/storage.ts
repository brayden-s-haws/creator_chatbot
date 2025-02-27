import fs from "fs/promises";
import path from "path";
import { Article, ContentChunk, Query, InsertArticle, InsertContentChunk, InsertQuery, SystemStatusType } from "@shared/schema";

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

export class MemStorage implements IStorage {
  private articles: Map<number, Article>;
  private contentChunks: Map<number, ContentChunk>;
  private queries: Map<number, Query>;
  private systemStatus: SystemStatusType;
  
  private articlesIdCounter: number;
  private contentChunksIdCounter: number;
  private queriesIdCounter: number;
  
  private dataDir: string;
  
  constructor() {
    this.articles = new Map();
    this.contentChunks = new Map();
    this.queries = new Map();
    this.articlesIdCounter = 1;
    this.contentChunksIdCounter = 1;
    this.queriesIdCounter = 1;
    
    this.systemStatus = {
      dbConnected: true,
      lastUpdated: null,
      nextUpdate: null,
      articlesIndexed: 0,
    };
    
    this.dataDir = path.join(process.cwd(), "data");
  }
  
  // Article operations
  async getArticles(): Promise<Article[]> {
    return Array.from(this.articles.values());
  }
  
  async getArticleById(id: number): Promise<Article | undefined> {
    return this.articles.get(id);
  }
  
  async getArticleByUrl(url: string): Promise<Article | undefined> {
    return Array.from(this.articles.values()).find(article => article.url === url);
  }
  
  async getArticleByGuid(guid: string): Promise<Article | undefined> {
    return Array.from(this.articles.values()).find(article => article.guid === guid);
  }
  
  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const id = this.articlesIdCounter++;
    const article: Article = { ...insertArticle, id, fetchedAt: new Date() };
    this.articles.set(id, article);
    this.systemStatus.articlesIndexed = this.articles.size;
    this.systemStatus.lastUpdated = new Date().toISOString();
    await this.saveToFile();
    return article;
  }
  
  // Content chunk operations
  async getContentChunks(): Promise<ContentChunk[]> {
    return Array.from(this.contentChunks.values());
  }
  
  async getContentChunksByArticleId(articleId: number): Promise<ContentChunk[]> {
    return Array.from(this.contentChunks.values()).filter(chunk => chunk.articleId === articleId);
  }
  
  async createContentChunk(insertChunk: InsertContentChunk): Promise<ContentChunk> {
    const id = this.contentChunksIdCounter++;
    // Ensure embedding is provided (as required by ContentChunk type)
    const chunk: ContentChunk = { 
      ...insertChunk, 
      id, 
      embedding: insertChunk.embedding || [] 
    };
    this.contentChunks.set(id, chunk);
    await this.saveToFile();
    return chunk;
  }
  
  // Query operations
  async getQueries(): Promise<Query[]> {
    return Array.from(this.queries.values());
  }
  
  async createQuery(insertQuery: InsertQuery): Promise<Query> {
    const id = this.queriesIdCounter++;
    // Ensure embedding is provided (as required by Query type)
    const query: Query = { 
      ...insertQuery, 
      id, 
      createdAt: new Date(),
      embedding: insertQuery.embedding || []
    };
    this.queries.set(id, query);
    await this.saveToFile();
    return query;
  }
  
  // System status operations
  async getSystemStatus(): Promise<SystemStatusType> {
    return {
      ...this.systemStatus,
      articlesIndexed: this.articles.size,
    };
  }
  
  async updateSystemStatus(status: Partial<SystemStatusType>): Promise<SystemStatusType> {
    this.systemStatus = { ...this.systemStatus, ...status };
    await this.saveToFile();
    return this.systemStatus;
  }
  
  // Persistence operations
  async saveToFile(): Promise<void> {
    try {
      // Ensure data directory exists
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Serialize data
      const data = {
        articles: Array.from(this.articles.values()),
        contentChunks: Array.from(this.contentChunks.values()),
        queries: Array.from(this.queries.values()),
        systemStatus: this.systemStatus,
        counters: {
          articlesIdCounter: this.articlesIdCounter,
          contentChunksIdCounter: this.contentChunksIdCounter,
          queriesIdCounter: this.queriesIdCounter,
        },
      };
      
      // Write to file
      await fs.writeFile(
        path.join(this.dataDir, "data.json"),
        JSON.stringify(data, null, 2)
      );
    } catch (error) {
      console.error("Failed to save data to file:", error);
    }
  }
  
  async loadFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.dataDir, "data.json");
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch {
        // File doesn't exist, nothing to load
        return;
      }
      
      // Read and parse data
      const content = await fs.readFile(filePath, "utf-8");
      const data = JSON.parse(content);
      
      // Restore data
      this.articles = new Map(data.articles.map((article: Article) => [article.id, article]));
      this.contentChunks = new Map(data.contentChunks.map((chunk: ContentChunk) => [chunk.id, chunk]));
      this.queries = new Map(data.queries.map((query: Query) => [query.id, query]));
      this.systemStatus = data.systemStatus;
      
      // Restore counters
      this.articlesIdCounter = data.counters.articlesIdCounter;
      this.contentChunksIdCounter = data.counters.contentChunksIdCounter;
      this.queriesIdCounter = data.counters.queriesIdCounter;
      
      console.log(`Loaded ${this.articles.size} articles, ${this.contentChunks.size} chunks, and ${this.queries.size} queries from file.`);
    } catch (error) {
      console.error("Failed to load data from file:", error);
    }
  }
}

// Create and initialize storage
export const storage = new MemStorage();

// Load data from file on startup
(async () => {
  await storage.loadFromFile();
})();
