import cron from "node-cron";
import { processRssAndUpdate } from "./rss-processor";
import { storage } from "./storage";

/**
 * Initialize and run worker for initial content fetch
 */
async function initialFetch() {
  try {
    // Check if we have any articles already
    const articles = await storage.getArticles();
    
    if (articles.length === 0) {
      console.log("No articles found. Performing initial content fetch...");
      await processRssAndUpdate();
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
  // Run initial fetch
  await initialFetch();
  
  // Schedule weekly updates (every Sunday at 3 AM)
  cron.schedule("0 3 * * 0", async () => {
    console.log("Running scheduled content update...");
    try {
      await processRssAndUpdate();
      console.log("Scheduled content update completed successfully");
    } catch (error) {
      console.error("Error during scheduled content update:", error);
    }
  });
  
  console.log("Content update worker scheduled (weekly on Sundays at 3 AM)");
}
