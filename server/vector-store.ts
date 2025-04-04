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
  similarityThreshold: number = 0.45 // Lowered threshold significantly to ensure we get results
): Promise<VectorDocumentWithScore[]> {
  console.log(`Searching for similar chunks with threshold ${similarityThreshold}`);
  
  // Make sure cache is initialized
  if (!cacheInitialized) {
    console.log("Cache not initialized, refreshing...");
    await refreshCache();
  }
  
  console.log(`Vector cache has ${vectorCache.length} documents`);
  
  // Check if embeddings in the cache are arrays
  const validDocs = vectorCache.filter(doc => Array.isArray(doc.embedding) && doc.embedding.length > 0);
  console.log(`Found ${validDocs.length} documents with valid embeddings`);
  
  if (validDocs.length === 0) {
    console.log("No valid embeddings found in the cache");
    return [];
  }
  
  // Calculate similarity scores using in-memory cache for performance
  const scoredDocuments = validDocs.map(doc => {
    const score = cosineSimilarity(queryEmbedding, doc.embedding);
    return {
      ...doc,
      score,
    };
  });
  
  // Log the top scores for debugging
  const topScores = [...scoredDocuments]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 5)
    .map(doc => `${doc.documentId}: ${doc.score?.toFixed(4)}`);
  
  console.log("Top similarity scores:", topScores);
  
  // Sort by similarity score (descending)
  scoredDocuments.sort((a, b) => (b.score || 0) - (a.score || 0));
  
  // Filter by threshold and limit
  const results = scoredDocuments
    .filter(doc => (doc.score || 0) >= similarityThreshold)
    .slice(0, limit);
  
  console.log(`Returning ${results.length} similar chunks above threshold ${similarityThreshold}`);
  
  return results;
}

/**
 * Initialize vector store from content chunks
 */
export async function initializeVectorStore(): Promise<void> {
  try {
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
    } catch (dbError: any) {
      // Check for database connection errors (expected in template mode)
      if (dbError.code === 'ECONNREFUSED') {
        log("Database connection not available - running in template mode", "vector-store");
        // In template mode, we'll load directly from backup file without attempting database operations
        vectorCache = []; // Clear cache since we can't connect to DB
        cacheInitialized = true; // Mark as initialized to prevent further DB connection attempts
        await loadFromBackup();
        return;
      }
      throw dbError; // Re-throw if it's not a connection error
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
    // Check if we're in template mode (no database connection)
    let isTemplateMode = false;
    let documents: any[] = [];
    
    try {
      // Get all vector documents from database
      documents = await db.select().from(vectorDocuments);
    } catch (dbError: any) {
      if (dbError.code === 'ECONNREFUSED') {
        isTemplateMode = true;
        log("Database not available for refresh - running in template mode", "vector-store");
        
        // In template mode, check if we can load from backup file
        try {
          await fs.access(vectorStorePath);
          const content = await fs.readFile(vectorStorePath, "utf-8");
          documents = JSON.parse(content);
          log(`Loaded ${documents.length} documents from backup file for cache refresh`, "vector-store");
        } catch (fsError) {
          // No backup file available or couldn't read it
          log("Could not load vector documents from backup for cache refresh", "vector-store");
          return;
        }
      } else {
        throw dbError; // Re-throw if it's not a connection error
      }
    }
    
    // Check first document to understand embedding format
    if (documents.length > 0 && !isTemplateMode) {
      const firstDoc = documents[0];
      console.log("First document embedding type:", typeof firstDoc.embedding);
      console.log("First document embedding is array?", Array.isArray(firstDoc.embedding));
      
      if (!Array.isArray(firstDoc.embedding) && typeof firstDoc.embedding === 'string') {
        try {
          // Try to parse if it's a JSON string
          console.log("Attempting to parse embedding as JSON string");
          const parsed = JSON.parse(firstDoc.embedding);
          console.log("Parsed successfully:", Array.isArray(parsed));
        } catch (e) {
          console.log("Not a valid JSON string");
        }
      }
    }
    
    // Update cache with proper type conversion for embeddings
    vectorCache = documents.map(doc => {
      let embeddingArray = [];
      
      // Handle different possible formats of the embedding data
      if (Array.isArray(doc.embedding)) {
        embeddingArray = doc.embedding;
      } else if (typeof doc.embedding === 'string') {
        try {
          // Try to parse if it's a JSON string
          const parsed = JSON.parse(doc.embedding);
          if (Array.isArray(parsed)) {
            embeddingArray = parsed;
          }
        } catch (e) {
          // Not a valid JSON string, ignore
        }
      } else if (doc.embedding && typeof doc.embedding === 'object') {
        // If it's an object with array-like properties
        try {
          embeddingArray = Object.values(doc.embedding);
        } catch (e) {
          // Unable to extract values
        }
      }
      
      return {
        ...doc,
        embedding: embeddingArray
      };
    });
    
    // Log vector cache stats
    const validEmbeddings = vectorCache.filter(doc => 
      Array.isArray(doc.embedding) && doc.embedding.length > 0
    ).length;
    
    console.log(`Vector cache loaded: ${documents.length} total, ${validEmbeddings} with valid embeddings`);
    
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
      // Try template file if the backup doesn't exist
      try {
        const templatePath = path.join(dataDir, "vector-store.json.template");
        await fs.access(templatePath);
        log("Using template vector store file", "vector-store");
        
        // Read template file
        const templateContent = await fs.readFile(templatePath, "utf-8");
        // Create backup file from template
        await fs.writeFile(vectorStorePath, templateContent);
      } catch {
        // Neither backup nor template exists
        log("No vector store backup or template file found", "vector-store");
        return;
      }
    }
    
    // Read and parse data
    const content = await fs.readFile(vectorStorePath, "utf-8");
    const documents = JSON.parse(content);
    
    // Check if we're in template mode (no database connection)
    let isTemplateMode = false;
    
    try {
      // Verify database connection with a quick test
      await db.select({ test: sql<number>`1` }).from(vectorDocuments).limit(1);
    } catch (dbError: any) {
      if (dbError.code === 'ECONNREFUSED') {
        isTemplateMode = true;
        log("Running in template mode without database connection", "vector-store");
      }
    }
    
    if (!isTemplateMode) {
      // Normal mode - insert into database
      for (const doc of documents) {
        const vectorDoc: InsertVectorDocument = {
          documentId: doc.documentId as string,
          content: doc.content as string,
          embedding: doc.embedding,
          articleId: doc.articleId as number,
          title: doc.title as string,
          url: doc.url as string,
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
      
      // Refresh cache from database
      await refreshCache();
    } else {
      // Template mode - load directly into memory cache
      vectorCache = documents.map(doc => {
        let embeddingArray = [];
        
        // Handle different possible formats of the embedding data
        if (Array.isArray(doc.embedding)) {
          embeddingArray = doc.embedding;
        } else if (typeof doc.embedding === 'string') {
          try {
            // Try to parse if it's a JSON string
            const parsed = JSON.parse(doc.embedding);
            if (Array.isArray(parsed)) {
              embeddingArray = parsed;
            }
          } catch (e) {
            // Not a valid JSON string, ignore
          }
        } else if (doc.embedding && typeof doc.embedding === 'object') {
          // If it's an object with array-like properties
          try {
            embeddingArray = Object.values(doc.embedding);
          } catch (e) {
            // Unable to extract values
          }
        }
        
        return {
          ...doc,
          embedding: embeddingArray
        };
      });
      
      cacheInitialized = true;
    }
    
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
