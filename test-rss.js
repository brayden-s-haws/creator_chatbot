// Simple script to test RSS parsing with fetch
import fetch from 'node-fetch';
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

// RSS feed URL
const RSS_FEED_URL = "https://runthebusiness.substack.com/feed";

async function testRssFeed() {
  try {
    console.log("Fetching RSS feed from:", RSS_FEED_URL);
    
    // Fetch the RSS feed
    const response = await fetch(RSS_FEED_URL);
    const xmlText = await response.text();
    
    // Parse the XML
    const result = await parseXml(xmlText);
    
    console.log("Feed title:", result.rss?.channel?.[0]?.title?.[0] || "Unknown");
    
    const items = result.rss?.channel?.[0]?.item || [];
    console.log("Total items in feed:", items.length);
    
    // Log the first 5 items
    console.log("\nFirst 5 items:");
    for (let i = 0; i < Math.min(5, items.length); i++) {
      const item = items[i];
      console.log(`${i+1}. ${item.title?.[0]} (${item.pubDate?.[0]})`);
      console.log(`   Link: ${item.link?.[0]}`);
      console.log(`   GUID: ${item.guid?.[0]._}`);
      console.log("");
    }
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
  }
}

testRssFeed();