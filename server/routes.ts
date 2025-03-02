import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { processRssAndUpdate } from "./rss-processor";
import { generateAnswer } from "./llm";
import { createEmbedding } from "./embeddings";
import { searchSimilarChunks } from "./vector-store";
import { schedule } from "./worker";
import { fetchMoreArticles } from "../scripts/fetch-more-articles";
import { handleCsvUpload, processExistingCsvFile } from "./import-api";

const router = express.Router();

// Chat endpoint
router.post("/api/chat", async (req, res) => {
  try {
    // Validate request body
    const schema = z.object({
      message: z.string().min(1).max(500),
      history: z.array(z.object({
        role: z.string(),
        content: z.string()
      })).optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ message: "Invalid request" });
    }
    
    const { message, history = [] } = validationResult.data;
    
    // Store the query and generate embedding
    const queryEmbedding = await createEmbedding(message);
    await storage.createQuery({
      query: message,
      embedding: queryEmbedding,
    });
    
    // Search for similar content
    const similarChunks = await searchSimilarChunks(queryEmbedding, 5);
    
    // Generate answer with conversation history
    const answer = await generateAnswer(message, similarChunks, history);
    
    return res.json(answer);
  } catch (error) {
    console.error("Error processing chat request:", error);
    return res.status(500).json({ message: "Failed to process request" });
  }
});

// Trigger content refresh from RSS feed
router.post("/api/refresh", async (req, res) => {
  try {
    // Start RSS processing
    const result = await processRssAndUpdate();
    
    // Update system status
    const now = new Date();
    await storage.updateSystemStatus({
      lastUpdated: now.toISOString(),
      articlesIndexed: (await storage.getArticles()).length
    });
    
    return res.json(result);
  } catch (error) {
    console.error("Error refreshing content:", error);
    return res.status(500).json({ message: "Failed to refresh content" });
  }
});

// Fetch additional articles from Substack archive
router.post("/api/fetch-more-articles", async (req, res) => {
  try {
    console.log("Manual fetch of more articles requested");
    
    // Send an immediate response to prevent timeout
    res.json({
      success: true,
      message: "Article fetch process started in background",
      inProgress: true
    });
    
    // Then continue processing in the background
    fetchMoreArticles()
      .then(async (archiveResult) => {
        // Update system status
        const now = new Date();
        await storage.updateSystemStatus({
          lastUpdated: now.toISOString(),
          articlesIndexed: (await storage.getArticles()).length
        });
        
        console.log(`Background article fetch completed. Added ${archiveResult.articlesAdded} articles.`);
      })
      .catch(error => {
        console.error("Error in background article fetch:", error);
      });
      
  } catch (error) {
    console.error("Error starting article fetch:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Failed to start article fetch process" 
    });
  }
});

// Get system status
router.get("/api/system-status", async (req, res) => {
  try {
    const status = await storage.getSystemStatus();
    return res.json(status);
  } catch (error) {
    console.error("Error fetching system status:", error);
    return res.status(500).json({ message: "Failed to get system status" });
  }
});

// Import articles from CSV upload
router.post("/api/import-csv", handleCsvUpload);

// Process an existing CSV file on the server
router.post("/api/process-csv", async (req, res) => {
  processExistingCsvFile(req, res);
});

// Import sample articles for testing
router.post("/api/import-sample", async (req, res) => {
  try {
    const sampleFile = "data/articles-sample.csv";
    
    // Send immediate response
    res.json({
      success: true,
      message: "Processing sample articles. This will continue in the background.",
      inProgress: true
    });
    
    // Process in background
    import('../scripts/import-from-csv')
      .then(module => {
        return module.importArticlesFromCsv(sampleFile);
      })
      .then(result => {
        console.log(`Sample CSV import completed. Added ${result.articlesAdded} articles and ${result.chunksAdded} chunks.`);
      })
      .catch(error => {
        console.error("Error importing sample articles:", error);
      });
  } catch (error) {
    console.error("Error starting sample import:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to start sample import"
    });
  }
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use(router);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize the worker to fetch content
  await schedule();
  
  return httpServer;
}
