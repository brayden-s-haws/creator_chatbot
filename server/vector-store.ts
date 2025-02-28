import { storage } from "./storage";
import { cosineSimilarity } from "./embeddings";
import fs from "fs/promises";
import path from "path";
import { db } from "./db";
import { vectorDocuments, InsertVectorDocument } from "@shared/schema";
import { eq, desc, sql } from "drizzle-orm";
import { log } from "./vite";

// Interface for vector document with score for search results
interface VectorDocumentWithScore {
  id: number;
  documentId: string;
  content: string;
  embedding: number[] | any; // Need to handle unknown type from database
  articleId: number;
  title: string;
  url: string;
  createdAt: Date;
  score?: number;
}

// Cache for in-memory vector operations
let vectorCache: VectorDocumentWithScore[] = [];
let cacheInitialized = false;

const dataDir = path.join(process.cwd(), "data");
const vectorStorePath = path.join(dataDir, "vector-store-backup.json");

/**
 * Add a document to the vector store
 */
export async function addDocumentToVectorStore(document: {
  id: string;
  content: string;
  embedding: number[];
  metadata: {
    articleId: number;
    title: string;
    url: string;
  };
}): Promise<void> {
  try {
    // Check if document already exists in database
    const existingDocs = await db.select()
      .from(vectorDocuments)
      .where(eq(vectorDocuments.documentId, document.id));
    
    const vectorDoc: InsertVectorDocument = {
      documentId: document.id,
      content: document.content,
      embedding: document.embedding,
      articleId: document.metadata.articleId,
      title: document.metadata.title,
      url: document.metadata.url,
    };
    
    if (existingDocs.length > 0) {
      // Update existing document
      await db.update(vectorDocuments)
        .set(vectorDoc)
        .where(eq(vectorDocuments.documentId, document.id));
      
      log(`Updated vector document ${document.id}`, "vector-store");
    } else {
      // Insert new document
      await db.insert(vectorDocuments).values(vectorDoc);
      log(`Added vector document ${document.id}`, "vector-store");
    }
    
    // Update cache
    await refreshCache();
    
    // Backup to file as well
    await backupVectorStore();
  } catch (error: any) {
    log(`Failed to add document to vector store: ${error.message}`, "vector-store");
    console.error("Failed to add document to vector store:", error);
  }
}

/**
 * Search for similar chunks based on embedding
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<VectorDocumentWithScore[]> {
  // Make sure cache is initialized
  if (!cacheInitialized) {
    await refreshCache();
  }
  
  // Calculate similarity scores using in-memory cache for performance
  const scoredDocuments = vectorCache.map(doc => ({
    ...doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  
  // Sort by similarity score (descending)
  scoredDocuments.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Filter by threshold and limit
  return scoredDocuments
    .filter(doc => (doc.score || 0) >= similarityThreshold)
    .slice(0, limit);
}

/**
 * Initialize vector store from content chunks
 */
export async function initializeVectorStore(): Promise<void> {
  try {
    // Check if we have documents in the database
    const count = await db.select({ count: sql<number>`count(*)` })
      .from(vectorDocuments);
    
    if (count[0].count === 0) {
      log("No vector documents found in database. Rebuilding from content chunks...", "vector-store");
      
      // Rebuild from content chunks
      const contentChunks = await storage.getContentChunks();
      const articles = await storage.getArticles();
      const articlesMap = new Map(articles.map(article => [article.id, article]));
      
      for (const chunk of contentChunks) {
        const article = articlesMap.get(chunk.articleId);
        
        if (article && chunk.embedding) {
          await addDocumentToVectorStore({
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
      
      log(`Vector store initialized with ${count[0].count} documents`, "vector-store");
    } else {
      // Load into memory cache for fast vector operations
      await refreshCache();
      log(`Vector store loaded with ${vectorCache.length} documents`, "vector-store");
    }
  } catch (error: any) {
    log(`Failed to initialize vector store: ${error.message}`, "vector-store");
    console.error("Failed to initialize vector store:", error);
    
    // Try to load from backup file as fallback
    await loadFromBackup();
  }
}

/**
 * Refresh the in-memory vector cache from database
 */
async function refreshCache(): Promise<void> {
  try {
    // Get all vector documents from database
    const documents = await db.select().from(vectorDocuments);
    
    // Update cache with proper type conversion for embeddings
    vectorCache = documents.map(doc => ({
      ...doc,
      embedding: Array.isArray(doc.embedding) ? doc.embedding : []
    }));
    cacheInitialized = true;
    
    log(`Refreshed vector cache with ${documents.length} documents`, "vector-store");
  } catch (error: any) {
    log(`Failed to refresh vector cache: ${error.message}`, "vector-store");
    console.error("Failed to refresh vector cache:", error);
  }
}

/**
 * Backup vector store to file
 */
async function backupVectorStore(): Promise<void> {
  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Get all documents from database
    const documents = await db.select().from(vectorDocuments);
    
    // Write to backup file
    await fs.writeFile(
      vectorStorePath,
      JSON.stringify(documents, null, 2)
    );
    
    log(`Backed up ${documents.length} vector documents to file`, "vector-store");
  } catch (error: any) {
    log(`Failed to backup vector store to file: ${error.message}`, "vector-store");
    console.error("Failed to backup vector store to file:", error);
  }
}

/**
 * Load vector store from backup file
 */
async function loadFromBackup(): Promise<void> {
  try {
    // Check if file exists
    try {
      await fs.access(vectorStorePath);
    } catch {
      // File doesn't exist, nothing to load
      log("No vector store backup file found", "vector-store");
      return;
    }
    
    // Read and parse data
    const content = await fs.readFile(vectorStorePath, "utf-8");
    const documents = JSON.parse(content);
    
    // Insert into database
    for (const doc of documents) {
      const vectorDoc: InsertVectorDocument = {
        documentId: doc.documentId,
        content: doc.content,
        embedding: doc.embedding,
        articleId: doc.articleId,
        title: doc.title,
        url: doc.url,
      };
      
      try {
        await db.insert(vectorDocuments)
          .values(vectorDoc)
          .onConflictDoUpdate({
            target: vectorDocuments.documentId,
            set: vectorDoc
          });
      } catch (insertError: any) {
        log(`Failed to restore document ${doc.documentId}: ${insertError.message}`, "vector-store");
      }
    }
    
    // Refresh cache
    await refreshCache();
    
    log(`Restored ${documents.length} documents from backup file`, "vector-store");
  } catch (error: any) {
    log(`Failed to load from backup: ${error.message}`, "vector-store");
    console.error("Failed to load from backup:", error);
  }
}

// Initialize vector store
(async () => {
  await initializeVectorStore();
})();
