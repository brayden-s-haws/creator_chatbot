import cron from "node-cron";
import { processRssAndUpdate } from "./rss-processor";
import { storage } from "./storage";
import { fetchMoreArticles } from "../scripts/fetch-more-articles";

/**
 * Initialize and run worker for initial content fetch
 */
async function initialFetch() {
  try {
    // Check if we have any articles already
    const articles = await storage.getArticles();
    
    if (articles.length === 0) {
      console.log("No articles found. Performing initial content fetch...");
      // Process RSS feed first
      await processRssAndUpdate();
      
      // Then fetch more articles from the archive
      console.log("Fetching additional articles from archive...");
      await fetchMoreArticles();
    } else if (articles.length < 20) {
      console.log(`Found only ${articles.length} existing articles. Fetching more from archive...`);
      await fetchMoreArticles();
    } else {
      console.log(`Found ${articles.length} existing articles. Skipping initial fetch.`);
    }
  } catch (error) {
    console.error("Error during initial fetch:", error);
  }
}

/**
 * Schedule periodic content updates
 */
export async function schedule() {
  // Run initial fetch in the background to prevent blocking server startup
  setTimeout(() => {
    initialFetch().catch(error => {
      console.error("Error during background initial fetch:", error);
    });
  }, 5000); // Wait 5 seconds after server starts before fetching
  
  // Schedule weekly updates (every Sunday at 3 AM)
  cron.schedule("0 3 * * 0", async () => {
    console.log("Running scheduled content update...");
    try {
      // Process RSS feed for new articles
      await processRssAndUpdate();
      
      // Every month (first Sunday), also fetch articles from archive
      const now = new Date();
      if (now.getDate() <= 7) { // First week of the month
        console.log("First week of month, fetching additional articles from archive...");
        await fetchMoreArticles();
      }
      
      console.log("Scheduled content update completed successfully");
      
      // Update system status
      const nextUpdate = new Date(now.getTime());
      nextUpdate.setDate(nextUpdate.getDate() + 7); // Next Sunday
      
      await storage.updateSystemStatus({
        lastUpdated: now.toISOString(),
        nextUpdate: nextUpdate.toISOString(),
        articlesIndexed: (await storage.getArticles()).length
      });
    } catch (error) {
      console.error("Error during scheduled content update:", error);
    }
  });
  
  console.log("Content update worker scheduled (weekly on Sundays at 3 AM)");
  console.log("Initial content fetch will begin shortly in the background");
}
