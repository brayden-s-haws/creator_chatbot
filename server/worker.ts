import cron from "node-cron";
import { processRssAndUpdate } from "./rss-processor";
import { storage } from "./storage";
import { fetchMoreArticles } from "../scripts/fetch-more-articles";

/**
 * Schedule periodic content updates
 */
export async function schedule() {
  // Skip initial fetch, only do scheduled updates
  console.log("Skipping initial content fetch. Only scheduled RSS updates will occur.");
  
  // Schedule weekly updates (every Sunday at 3 AM)
  cron.schedule("0 3 * * 0", async () => {
    console.log("Running scheduled RSS update...");
    try {
      // Process RSS feed for new articles only
      await processRssAndUpdate();
      
      console.log("Scheduled RSS update completed successfully");
      
      // Update system status
      const now = new Date();
      const nextUpdate = new Date(now.getTime());
      nextUpdate.setDate(nextUpdate.getDate() + 7); // Next Sunday
      
      await storage.updateSystemStatus({
        lastUpdated: now.toISOString(),
        nextUpdate: nextUpdate.toISOString(),
        articlesIndexed: (await storage.getArticles()).length
      });
    } catch (error) {
      console.error("Error during scheduled RSS update:", error);
    }
  });
  
  console.log("RSS update worker scheduled (weekly on Sundays at 3 AM)");
}
