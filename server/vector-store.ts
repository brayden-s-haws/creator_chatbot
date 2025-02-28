
import { storage } from "./storage";
import { cosineSimilarity } from "./embeddings";
import { getDb } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";

// Type for document in vector store
interface VectorDocument {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    articleId: number;
    title: string;
    url: string;
  };
}

// Fallback in-memory vector store when DB is not available
let memoryVectorStore: VectorDocument[] = [];

const dataDir = path.join(process.cwd(), "data");
const vectorStorePath = path.join(dataDir, "vector-store.json");

/**
 * Add a document to the vector store
 */
export async function addDocumentToVectorStore(document: VectorDocument): Promise<void> {
  const db = getDb();
  
  if (db) {
    // Use PostgreSQL
    const existingDocs = await db.select()
      .from(schema.vectorDocuments)
      .where(eq(schema.vectorDocuments.id, document.id));
    
    if (existingDocs.length > 0) {
      // Update existing document
      await db.update(schema.vectorDocuments)
        .set({
          content: document.content,
          embedding: document.embedding,
          metadata: document.metadata
        })
        .where(eq(schema.vectorDocuments.id, document.id));
    } else {
      // Insert new document
      await db.insert(schema.vectorDocuments).values({
        id: document.id,
        content: document.content,
        embedding: document.embedding,
        metadata: document.metadata
      });
    }
  } else {
    // Use in-memory storage with file persistence
    // Check if document already exists
    const existingIndex = memoryVectorStore.findIndex(doc => doc.id === document.id);
    
    if (existingIndex !== -1) {
      // Replace existing document
      memoryVectorStore[existingIndex] = document;
    } else {
      // Add new document
      memoryVectorStore.push(document);
    }
    
    // Save to file
    await saveVectorStore();
  }
}

/**
 * Search for similar chunks based on embedding
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<VectorDocument[]> {
  const db = getDb();
  
  if (db) {
    // Use PostgreSQL
    // Since we can't easily calculate cosine similarity in SQL,
    // we'll fetch all documents and calculate locally
    const allDocs = await db.select().from(schema.vectorDocuments);
    
    // Calculate similarity scores
    const scoredDocuments = allDocs.map(doc => ({
      id: doc.id,
      content: doc.content,
      embedding: doc.embedding as number[],
      metadata: doc.metadata as VectorDocument['metadata'],
      score: cosineSimilarity(queryEmbedding, doc.embedding as number[])
    }));
    
    // Sort by similarity score (descending)
    scoredDocuments.sort((a, b) => b.score - a.score);
    
    // Filter by threshold and limit
    return scoredDocuments
      .filter(doc => doc.score >= similarityThreshold)
      .slice(0, limit);
  } else {
    // Use in-memory store
    // Calculate similarity scores
    const scoredDocuments = memoryVectorStore.map(doc => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding),
    }));
    
    // Sort by similarity score (descending)
    scoredDocuments.sort((a, b) => b.score - a.score);
    
    // Filter by threshold and limit
    return scoredDocuments
      .filter(doc => doc.score >= similarityThreshold)
      .slice(0, limit);
  }
}

/**
 * Initialize vector store from content chunks
 */
export async function initializeVectorStore(): Promise<void> {
  const db = getDb();
  
  if (db) {
    // Use PostgreSQL
    // Check if we have any documents
    const existingDocs = await db.select({ count: schema.vectorDocuments }).from(schema.vectorDocuments);
    
    if (existingDocs.length === 0 || existingDocs[0].count === 0) {
      console.log("Rebuilding vector store from content chunks...");
      
      const contentChunks = await storage.getContentChunks();
      const articles = await storage.getArticles();
      const articlesMap = new Map(articles.map(article => [article.id, article]));
      
      for (const chunk of contentChunks) {
        const article = articlesMap.get(chunk.articleId);
        
        if (article && chunk.embedding) {
          await db.insert(schema.vectorDocuments).values({
            id: `chunk-${chunk.id}`,
            content: chunk.content,
            embedding: chunk.embedding as number[],
            metadata: {
              articleId: article.id,
              title: article.title,
              url: article.url,
            }
          });
        }
      }
      
      const count = await db.select({ count: schema.vectorDocuments }).from(schema.vectorDocuments);
      console.log(`Vector store initialized with ${count[0].count} documents`);
    }
  } else {
    // Use in-memory with file persistence
    // First try to load from file
    await loadVectorStore();
    
    // If vector store is empty, rebuild from content chunks
    if (memoryVectorStore.length === 0) {
      console.log("Rebuilding vector store from content chunks...");
      
      const contentChunks = await storage.getContentChunks();
      const articles = await storage.getArticles();
      const articlesMap = new Map(articles.map(article => [article.id, article]));
      
      for (const chunk of contentChunks) {
        const article = articlesMap.get(chunk.articleId);
        
        if (article && chunk.embedding) {
          memoryVectorStore.push({
            id: `chunk-${chunk.id}`,
            content: chunk.content,
            embedding: chunk.embedding as number[],
            metadata: {
              articleId: article.id,
              title: article.title,
              url: article.url,
            },
          });
        }
      }
      
      console.log(`Vector store initialized with ${memoryVectorStore.length} documents`);
      
      // Save to file
      await saveVectorStore();
    }
  }
}

/**
 * Save vector store to file (only used for in-memory fallback)
 */
async function saveVectorStore(): Promise<void> {
  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Write to file
    await fs.writeFile(
      vectorStorePath,
      JSON.stringify(memoryVectorStore, null, 2)
    );
  } catch (error) {
    console.error("Failed to save vector store to file:", error);
  }
}

/**
 * Load vector store from file (only used for in-memory fallback)
 */
async function loadVectorStore(): Promise<void> {
  try {
    // Check if file exists
    try {
      await fs.access(vectorStorePath);
    } catch {
      // File doesn't exist, nothing to load
      return;
    }
    
    // Read and parse data
    const content = await fs.readFile(vectorStorePath, "utf-8");
    memoryVectorStore = JSON.parse(content);
    
    console.log(`Loaded ${memoryVectorStore.length} documents from vector store file.`);
  } catch (error) {
    console.error("Failed to load vector store from file:", error);
  }
}

// Initialize vector store
(async () => {
  await initializeVectorStore();
})();
