import { storage } from "./storage";
import { cosineSimilarity } from "./embeddings";
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

// In-memory vector store
let vectorStore: VectorDocument[] = [];

const dataDir = path.join(process.cwd(), "data");
const vectorStorePath = path.join(dataDir, "vector-store.json");

/**
 * Add a document to the vector store
 */
export async function addDocumentToVectorStore(document: VectorDocument): Promise<void> {
  // Check if document already exists
  const existingIndex = vectorStore.findIndex(doc => doc.id === document.id);
  
  if (existingIndex !== -1) {
    // Replace existing document
    vectorStore[existingIndex] = document;
  } else {
    // Add new document
    vectorStore.push(document);
  }
  
  // Save to file
  await saveVectorStore();
}

/**
 * Search for similar chunks based on embedding
 */
export async function searchSimilarChunks(
  queryEmbedding: number[],
  limit: number = 5,
  similarityThreshold: number = 0.7
): Promise<VectorDocument[]> {
  // Calculate similarity scores
  const scoredDocuments = vectorStore.map(doc => ({
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

/**
 * Initialize vector store from content chunks
 */
export async function initializeVectorStore(): Promise<void> {
  // First try to load from file
  await loadVectorStore();
  
  // If vector store is empty, rebuild from content chunks
  if (vectorStore.length === 0) {
    console.log("Rebuilding vector store from content chunks...");
    
    const contentChunks = await storage.getContentChunks();
    const articles = await storage.getArticles();
    const articlesMap = new Map(articles.map(article => [article.id, article]));
    
    for (const chunk of contentChunks) {
      const article = articlesMap.get(chunk.articleId);
      
      if (article && chunk.embedding) {
        vectorStore.push({
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
    
    console.log(`Vector store initialized with ${vectorStore.length} documents`);
    
    // Save to file
    await saveVectorStore();
  }
}

/**
 * Save vector store to file
 */
async function saveVectorStore(): Promise<void> {
  try {
    // Ensure data directory exists
    await fs.mkdir(dataDir, { recursive: true });
    
    // Write to file
    await fs.writeFile(
      vectorStorePath,
      JSON.stringify(vectorStore, null, 2)
    );
  } catch (error) {
    console.error("Failed to save vector store to file:", error);
  }
}

/**
 * Load vector store from file
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
    vectorStore = JSON.parse(content);
    
    console.log(`Loaded ${vectorStore.length} documents from vector store file.`);
  } catch (error) {
    console.error("Failed to load vector store from file:", error);
  }
}

// Initialize vector store
(async () => {
  await initializeVectorStore();
})();
