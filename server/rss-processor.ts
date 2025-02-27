import Parser from "rss-parser";
import axios from "axios";
import * as cheerio from "cheerio";
import { storage } from "./storage";
import { createEmbedding } from "./embeddings";
import { addDocumentToVectorStore } from "./vector-store";

// RSS feed URL
const RSS_FEED_URL = "https://runthebusiness.substack.com/feed";

// Define a custom parser type
type CustomFeed = {
  title: string;
  description: string;
  lastBuildDate: string;
};

type CustomItem = {
  title: string;
  link: string;
  pubDate: string;
  content: string;
  contentSnippet: string;
  guid: string;
  isoDate: string;
};

// Create parser instance
const parser = new Parser<CustomFeed, CustomItem>({
  customFields: {
    item: ["content"],
  },
});

/**
 * Extract clean article content from HTML
 */
async function extractArticleContent(url: string): Promise<string> {
  try {
    // Fetch the article page
    const response = await axios.get(url);
    const html = response.data;
    
    // Load into cheerio
    const $ = cheerio.load(html);
    
    // Find the article content
    // Substack typically uses div.post-content for the main content
    let content = "";
    
    // Attempt to get the main content
    $("div.post-content, div.post, div.body, div.article").each((_, element) => {
      // Get all paragraphs and headings
      $(element).find("p, h1, h2, h3, h4, h5, h6, ul, ol").each((_, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          content += text + "\n\n";
        }
      });
    });
    
    // If no content found, try a more generic approach
    if (!content) {
      $("article, div.content, main").find("p, h1, h2, h3, h4, h5, h6, ul, ol").each((_, elem) => {
        const text = $(elem).text().trim();
        if (text) {
          content += text + "\n\n";
        }
      });
    }
    
    // If still no content, just get the body text as a fallback
    if (!content) {
      content = $("body").text().trim().replace(/\s+/g, " ");
    }
    
    return content.trim();
  } catch (error) {
    console.error(`Error extracting content from ${url}:`, error);
    return "";
  }
}

/**
 * Split article content into chunks
 */
function splitContentIntoChunks(content: string, maxChunkSize: number = 500): string[] {
  // Split by paragraphs first
  const paragraphs = content.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";
  
  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed the chunk size
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = paragraph;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }
  
  // Add the final chunk if it has content
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  return chunks;
}

/**
 * Process an individual RSS item
 */
async function processRssItem(item: CustomItem): Promise<void> {
  // Check if article already exists by GUID
  const existingArticle = await storage.getArticleByGuid(item.guid);
  
  if (existingArticle) {
    console.log(`Article already exists: ${item.title}`);
    return;
  }
  
  // Extract full content
  const fullContent = await extractArticleContent(item.link);
  
  if (!fullContent) {
    console.warn(`Failed to extract content for article: ${item.title}`);
    return;
  }
  
  // Create article
  const article = await storage.createArticle({
    title: item.title,
    url: item.link,
    content: fullContent,
    publishedAt: new Date(item.isoDate || item.pubDate),
    guid: item.guid,
  });
  
  console.log(`Created article: ${article.title}`);
  
  // Split content into chunks
  const chunks = splitContentIntoChunks(fullContent);
  
  // Process each chunk
  for (const chunkContent of chunks) {
    // Generate embedding
    const embedding = await createEmbedding(chunkContent);
    
    // Create chunk in storage
    const chunk = await storage.createContentChunk({
      articleId: article.id,
      content: chunkContent,
      embedding,
    });
    
    // Add to vector store
    await addDocumentToVectorStore({
      id: `chunk-${chunk.id}`,
      content: chunkContent,
      embedding,
      metadata: {
        articleId: article.id,
        title: article.title,
        url: article.url,
      },
    });
  }
  
  console.log(`Processed ${chunks.length} chunks for article: ${article.title}`);
}

/**
 * Process RSS feed and update content
 */
export async function processRssAndUpdate(): Promise<{
  articlesAdded: number;
  chunksAdded: number;
}> {
  try {
    console.log("Fetching RSS feed from:", RSS_FEED_URL);
    
    // Parse RSS feed
    const feed = await parser.parseURL(RSS_FEED_URL);
    
    let articlesAdded = 0;
    let chunksAdded = 0;
    
    // Get initial counts
    const initialArticles = (await storage.getArticles()).length;
    const initialChunks = (await storage.getContentChunks()).length;
    
    // Process each item
    for (const item of feed.items) {
      await processRssItem(item);
    }
    
    // Get updated counts
    const updatedArticles = (await storage.getArticles()).length;
    const updatedChunks = (await storage.getContentChunks()).length;
    
    articlesAdded = updatedArticles - initialArticles;
    chunksAdded = updatedChunks - initialChunks;
    
    // Update system status
    const now = new Date();
    const nextUpdate = new Date(now);
    nextUpdate.setDate(nextUpdate.getDate() + 7); // 1 week from now
    
    await storage.updateSystemStatus({
      lastUpdated: now.toISOString(),
      nextUpdate: nextUpdate.toISOString(),
    });
    
    console.log(`RSS processing complete. Added ${articlesAdded} articles and ${chunksAdded} chunks.`);
    
    return {
      articlesAdded,
      chunksAdded,
    };
  } catch (error) {
    console.error("Error processing RSS feed:", error);
    throw error;
  }
}
