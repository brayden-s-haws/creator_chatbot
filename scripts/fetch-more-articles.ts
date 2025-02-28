import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../server/storage';
import { createEmbedding } from '../server/embeddings';
import { addDocumentToVectorStore } from '../server/vector-store';
import { processRssAndUpdate } from '../server/rss-processor';

// Constants
const SUBSTACK_URL = 'https://runthebusiness.substack.com';
const ARCHIVE_URL = `${SUBSTACK_URL}/archive`;
const MAX_PAGES = 10; // Limit the number of archive pages to process

/**
 * Split content into chunks, similar to the rss-processor function
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
 * Extract article content from a Substack post URL
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
 * Process a single article
 */
async function processArticle(url: string, title: string, pubDate: string, guid: string): Promise<boolean> {
  try {
    // Check if article already exists by URL or GUID
    const existingArticle = await storage.getArticleByGuid(guid);
    
    if (existingArticle) {
      console.log(`Article already exists: ${title}`);
      return false;
    }
    
    // Extract full content
    const fullContent = await extractArticleContent(url);
    
    if (!fullContent) {
      console.warn(`Failed to extract content for article: ${title}`);
      return false;
    }
    
    // Create article
    const article = await storage.createArticle({
      title: title,
      url: url,
      content: fullContent,
      publishedAt: new Date(pubDate),
      guid: guid,
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
    return true;
  } catch (error) {
    console.error(`Error processing article ${url}:`, error);
    return false;
  }
}

/**
 * Scrape archive page for articles
 */
async function scrapeArchivePage(pageNumber: number): Promise<{ 
  articles: number,
  hasMorePages: boolean 
}> {
  const url = pageNumber === 1 
    ? ARCHIVE_URL 
    : `${ARCHIVE_URL}?page=${pageNumber}`;
  
  console.log(`Scraping archive page ${pageNumber}: ${url}`);
  
  try {
    const response = await axios.get(url);
    const html = response.data;
    const $ = cheerio.load(html);
    
    let articlesProcessed = 0;
    let hasMorePages = false;
    
    // Check if there's a next page link
    $('a.next-page-button').each((_, element) => {
      hasMorePages = true;
    });
    
    // Based on our analysis, we'll extract links directly from the archive page
    console.log("Extracting article links directly");
    
    // Find all links to substack articles, filtering out duplicates and comment links
    const articleLinks: Array<{ url: string, title: string, date: string }> = [];
    const processedUrls = new Set<string>();
    
    $('a[href*="https://runthebusiness.substack.com/p/"]').each((_, element) => {
      const link = $(element);
      const href = link.attr('href') || '';
      
      // Skip comment links or already processed URLs
      if (href.includes('/comments') || processedUrls.has(href)) {
        return;
      }
      
      // Try to find title near the link
      let title = link.text().trim();
      
      // If the link text is empty or too short, try to find a better title
      if (!title || title.length < 5) {
        // Look for h2 or h3 elements nearby
        const parentDiv = link.closest('div');
        
        if (parentDiv) {
          // Check nearby heading elements
          const nearbyH2 = parentDiv.find('h2').first();
          const nearbyH3 = parentDiv.find('h3').first();
          
          if (nearbyH2.length) {
            title = nearbyH2.text().trim();
          } else if (nearbyH3.length) {
            title = nearbyH3.text().trim();
          }
        }
        
        // If still no good title, use the URL path as a fallback
        if (!title || title.length < 5) {
          const urlPath = new URL(href).pathname;
          const pathParts = urlPath.split('/');
          const slug = pathParts[pathParts.length - 1];
          title = slug.replace(/-/g, ' ');
          // Capitalize first letter of each word
          title = title
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }
      }
      
      // Try to find date near the link
      let date = new Date().toISOString(); // Default to current date
      
      // Get the month header if available
      const monthHeader = link.closest('section').find('h3.monthHeader-nt8KgE').first();
      if (monthHeader.length) {
        const monthText = monthHeader.text().trim();
        if (monthText) {
          try {
            // Parse month header (like "December 2024")
            const parsedDate = new Date(monthText);
            if (!isNaN(parsedDate.getTime())) {
              date = parsedDate.toISOString();
            }
          } catch (e) {
            // Ignore parsing errors
          }
        }
      }
      
      // Add to array and mark URL as processed
      articleLinks.push({ url: href, title, date });
      processedUrls.add(href);
    });
    
    console.log(`Found ${articleLinks.length} unique article links on page ${pageNumber}`);
    
    // Process each unique article
    for (const articleInfo of articleLinks) {
      console.log(`Processing article: ${articleInfo.title}`);
      const { url, title, date } = articleInfo;
      
      // Use URL as guid
      const guid = url;
      
      const success = await processArticle(url, title, date, guid);
      if (success) {
        articlesProcessed++;
      }
    }
    
    // Also try the standard archive pattern as a fallback
    if (articlesProcessed === 0) {
      console.log("No articles processed with direct link extraction, trying fallback method");
      
      // Find all "Next" links to detect pagination
      $('a').each((_, element) => {
        const text = $(element).text().trim().toLowerCase();
        if (text === 'next' || text === 'next page' || text === 'older') {
          hasMorePages = true;
        }
      });
      
      // Extract direct links with '/p/' in the URL (substack post pattern)
      $('a[href*="/p/"]').each((_, element) => {
        const link = $(element);
        const href = link.attr('href') || '';
        
        // Skip comment links and already processed URLs
        if (href.includes('/comments') || processedUrls.has(href)) {
          return;
        }
        
        const fullLink = href.startsWith('http') ? href : `${SUBSTACK_URL}${href}`;
        const title = link.text().trim() || href.split('/').pop()?.replace(/-/g, ' ') || `Article`;
        const pubDate = new Date().toISOString(); // Default to current date
        
        if (fullLink && fullLink.includes('/p/')) {
          console.log(`Processing direct link: ${title} - ${fullLink}`);
          processArticle(fullLink, title, pubDate, fullLink).then(success => {
            if (success) articlesProcessed++;
          });
        }
      });
    }
    
    // Find all post div elements
    const posts = $('div.post-preview, div.post-item, article.post, div.archive-item');
    
    // Process posts found with regular selectors
    for (let i = 0; i < posts.length; i++) {
      const post = posts.eq(i);
      
      // Try multiple selectors for title, link, and date
      const titleElement = post.find('h3.post-preview-title, h2, h3, .post-title');
      const linkElement = post.find('a.post-preview-title-link, a[href*="/p/"], a');
      const dateElement = post.find('div.post-preview-date, time, .post-date, .date');
      
      const title = titleElement.text().trim() || `Article ${i+1}`;
      const link = linkElement.attr('href');
      
      // Skip if no link or already processed
      if (!link || processedUrls.has(link)) {
        continue;
      }
      
      const fullLink = link.startsWith('http') ? link : `${SUBSTACK_URL}${link}`;
      const pubDate = dateElement.text().trim() || new Date().toISOString();
      
      // Generate a guid from the URL
      const guid = fullLink;
      
      if (title && fullLink) {
        console.log(`Processing article: ${title}`);
        const success = await processArticle(fullLink, title, pubDate, guid);
        if (success) {
          articlesProcessed++;
        }
      }
    }
    
    return {
      articles: articlesProcessed,
      hasMorePages
    };
  } catch (error) {
    console.error(`Error scraping archive page ${pageNumber}:`, error);
    return {
      articles: 0,
      hasMorePages: false
    };
  }
}

/**
 * Main function to fetch more articles
 */
export async function fetchMoreArticles(): Promise<{ 
  articlesAdded: number 
}> {
  let totalArticlesAdded = 0;
  let currentPage = 1;
  let hasMorePages = true;
  
  console.log("Starting to fetch more articles from Substack archive...");
  
  // Then process archive pages
  while (hasMorePages && currentPage <= MAX_PAGES) {
    const result = await scrapeArchivePage(currentPage);
    totalArticlesAdded += result.articles;
    hasMorePages = result.hasMorePages;
    
    console.log(`Processed page ${currentPage}, added ${result.articles} articles. Has more pages: ${hasMorePages}`);
    
    // Move to next page
    currentPage++;
    
    // Add a delay to avoid overloading the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Update system status
  const now = new Date();
  await storage.updateSystemStatus({
    lastUpdated: now.toISOString(),
    articlesIndexed: (await storage.getArticles()).length
  });
  
  console.log(`Completed fetching articles. Total added: ${totalArticlesAdded}`);
  
  return {
    articlesAdded: totalArticlesAdded
  };
}