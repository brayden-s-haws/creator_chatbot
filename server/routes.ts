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

const router = express.Router();

// Chat endpoint
router.post("/api/chat", async (req, res) => {
  try {
    // Validate request body
    const schema = z.object({
      message: z.string().min(1).max(500),
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ message: "Invalid request" });
    }
    
    const { message } = validationResult.data;
    
    // Store the query and generate embedding
    const queryEmbedding = await createEmbedding(message);
    await storage.createQuery({
      query: message,
      embedding: queryEmbedding,
    });
    
    // Search for similar content
    const similarChunks = await searchSimilarChunks(queryEmbedding, 5);
    
    // Generate answer
    const answer = await generateAnswer(message, similarChunks);
    
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
    
    // Fetch from archive
    const archiveResult = await fetchMoreArticles();
    
    // Update system status
    const now = new Date();
    await storage.updateSystemStatus({
      lastUpdated: now.toISOString(),
      articlesIndexed: (await storage.getArticles()).length
    });
    
    return res.json({
      success: true,
      articlesAdded: archiveResult.articlesAdded,
      totalArticles: (await storage.getArticles()).length
    });
  } catch (error) {
    console.error("Error fetching more articles:", error);
    return res.status(500).json({ message: "Failed to fetch more articles" });
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

export async function registerRoutes(app: Express): Promise<Server> {
  // Register API routes
  app.use(router);
  
  // Create HTTP server
  const httpServer = createServer(app);
  
  // Initialize the worker to fetch content
  await schedule();
  
  return httpServer;
}
