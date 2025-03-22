import axios from 'axios';
import * as cheerio from 'cheerio';
import { storage } from '../server/storage';
import { createEmbedding } from '../server/embeddings';
import { addDocumentToVectorStore } from '../server/vector-store';
import { processRssAndUpdate } from '../server/rss-processor';

// Constants - Replace with your own content source URLs
const CONTENT_SOURCE_URL = 'https://example.com';
const ARCHIVE_URL = `${CONTENT_SOURCE_URL}/archive`;
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
 * Extract article content from a post URL
 */
async function extractArticleContent(url: string): Promise<string> {
  try {
    // Fetch the article page
    const response = await axios.get(url);
    const html = response.data;
    
    // Load into cheerio
    const $ = cheerio.load(html);
    
    // Find the article content
    // Look for standard content containers
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
  // Construct URL differently for different pages
  // Direct method:
  const url = pageNumber === 1 
    ? ARCHIVE_URL 
    : `${ARCHIVE_URL}?page=${pageNumber}`;
    
  // Try an alternative URL format as well (sometimes content sites use a different structure)
  const alternativeUrl = pageNumber === 1
    ? ARCHIVE_URL
    : `${CONTENT_SOURCE_URL}/archive/${pageNumber}`;
  
  console.log(`Scraping archive page ${pageNumber}: ${url}`);
  
  try {
    // Try the primary URL first
    let response;
    try {
      response = await axios.get(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`Error accessing primary URL ${url}, trying alternative URL ${alternativeUrl}: ${errorMessage}`);
      response = await axios.get(alternativeUrl);
    }
    
    const html = response.data;
    const $ = cheerio.load(html);
    
    let articlesProcessed = 0;
    let hasMorePages = false;
    
    // Enhanced pagination detection - look for any indication of pagination
    $('a, button, div.pagination').each((_, element) => {
      const el = $(element);
      const text = el.text().trim().toLowerCase();
      const href = el.attr('href') || '';
      
      // Check various common pagination indicators
      if (
        text.includes('next') || 
        text.includes('page') || 
        text.includes('older') ||
        href.includes('page=') ||
        href.includes('/archive/') ||
        el.attr('class')?.toLowerCase().includes('pagination')
      ) {
        console.log(`Found pagination indicator: ${text || href}`);
        hasMorePages = true;
      }
    });
    
    // For page 1, we assume there might be more even if we don't find pagination links
    if (pageNumber === 1) {
      hasMorePages = true;
    }
    
    console.log("Extracting article links more aggressively");
    
    // Find all links on the page, not just substack specific ones
    const articleLinks: Array<{ url: string, title: string, date: string }> = [];
    const processedUrls = new Set<string>();
    
    // Broader link search - any link that could be a post
    $('a').each((_, element) => {
      const link = $(element);
      const href = link.attr('href') || '';
      
      // Filter for likely post links
      const isLikelyPost = (
        (href.includes('/p/') || href.match(/\/[a-z0-9-]+$/i)) && 
        !href.includes('/comments') && 
        !href.includes('/subscribe') &&
        !href.includes('/account') &&
        !href.includes('/about') &&
        !processedUrls.has(href)
      );
      
      if (!isLikelyPost) return;
      
      // Construct full URL if relative
      const fullUrl = href.startsWith('http') ? href : `${CONTENT_SOURCE_URL}${href.startsWith('/') ? href : `/${href}`}`;
      
      // Try to find title near the link
      let title = link.text().trim();
      
      // If the link text is empty or too short, try to find a better title
      if (!title || title.length < 5) {
        // Look for various title-like elements nearby
        const parentDiv = link.closest('div, article, section');
        
        if (parentDiv) {
          // Check nearby heading elements
          const nearbyHeading = parentDiv.find('h1, h2, h3, h4, strong, b, .title, .post-title').first();
          
          if (nearbyHeading.length) {
            title = nearbyHeading.text().trim();
          }
        }
        
        // If still no good title, extract from URL path
        if (!title || title.length < 5) {
          try {
            const urlPath = new URL(fullUrl).pathname;
            const pathParts = urlPath.split('/').filter(part => part.length > 0);
            const slug = pathParts[pathParts.length - 1];
            title = slug.replace(/-/g, ' ');
            // Capitalize first letter of each word
            title = title
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } catch (e) {
            title = "Untitled Article";
          }
        }
      }
      
      // Try to find date near the link
      let date = new Date().toISOString(); // Default to current date
      
      // Look for date elements
      const parentContainer = link.closest('div, article, section');
      if (parentContainer) {
        const dateEl = parentContainer.find('time, .date, .post-date, [datetime]').first();
        if (dateEl.length) {
          const dateAttr = dateEl.attr('datetime');
          const dateText = dateEl.text().trim();
          
          if (dateAttr) {
            try {
              const parsedDate = new Date(dateAttr);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString();
              }
            } catch (e) {
              // Ignore parsing errors
            }
          } else if (dateText) {
            try {
              const parsedDate = new Date(dateText);
              if (!isNaN(parsedDate.getTime())) {
                date = parsedDate.toISOString();
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
      
      // Add to article links if it looks legitimate
      if (fullUrl.includes(CONTENT_SOURCE_URL) || fullUrl.includes('example.com')) {
        articleLinks.push({ url: fullUrl, title, date });
        processedUrls.add(fullUrl);
        processedUrls.add(href);
      }
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
    
    // Alternative approach - find all post div elements using a wider range of selectors
    if (articlesProcessed === 0) {
      console.log("Trying alternative post extraction method");
      
      const posts = $(
        'div.post, article, div.post-preview, div[class*="post"], ' +
        'div[class*="article"], article[class*="post"], div.archive-item, ' +
        'div.post-item, div.postitem, div.content-item'
      );
      
      console.log(`Found ${posts.length} potential post elements`);
      
      // Process posts found with regular selectors
      for (let i = 0; i < posts.length; i++) {
        const post = posts.eq(i);
        
        // Try multiple selectors for title, link, and date
        const titleElement = post.find('h1, h2, h3, h4, .title, .post-title');
        const linkElement = post.find('a[href*="/p/"], a[href*="example"], a');
        const dateElement = post.find('time, [datetime], .date, .post-date');
        
        const title = titleElement.text().trim() || `Article ${i+1}`;
        const link = linkElement.attr('href');
        
        // Skip if no link or already processed
        if (!link || processedUrls.has(link)) {
          continue;
        }
        
        const fullLink = link.startsWith('http') ? link : `${CONTENT_SOURCE_URL}${link.startsWith('/') ? link : `/${link}`}`;
        
        // Try to extract date information
        let pubDate = new Date().toISOString();
        if (dateElement.length) {
          const dateAttr = dateElement.attr('datetime');
          const dateText = dateElement.text().trim();
          
          if (dateAttr) {
            try {
              const parsedDate = new Date(dateAttr);
              if (!isNaN(parsedDate.getTime())) {
                pubDate = parsedDate.toISOString();
              }
            } catch (e) {
              // Ignore parsing errors
            }
          } else if (dateText) {
            try {
              const parsedDate = new Date(dateText);
              if (!isNaN(parsedDate.getTime())) {
                pubDate = parsedDate.toISOString();
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
        
        // Generate a guid from the URL
        const guid = fullLink;
        
        if (title && fullLink && (fullLink.includes(CONTENT_SOURCE_URL) || fullLink.includes('example.com'))) {
          console.log(`Processing article from post element: ${title}`);
          const success = await processArticle(fullLink, title, pubDate, guid);
          if (success) {
            articlesProcessed++;
          }
        }
      }
    }
    
    return {
      articles: articlesProcessed,
      hasMorePages
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Error scraping archive page ${pageNumber}: ${errorMessage}`);
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
  
  console.log("Starting to fetch more articles from content source archive...");
  
  // First, check how many articles we already have
  const currentArticles = await storage.getArticles();
  console.log(`Current articles in database: ${currentArticles.length}`);
  
  // Process archive pages - force check multiple pages even if pagination detection isn't working
  // This ensures we don't miss older articles
  for (let currentPage = 1; currentPage <= 5; currentPage++) {
    console.log(`Checking archive page ${currentPage}...`);
    const result = await scrapeArchivePage(currentPage);
    totalArticlesAdded += result.articles;
    
    console.log(`Processed page ${currentPage}, added ${result.articles} articles.`);
    
    // Add a longer delay to avoid rate limiting (Too Many Requests)
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // If we didn't add any articles on this page and we're past page 2, we can stop
    // (page 1 might be just recent articles we already have)
    if (result.articles === 0 && currentPage > 2) {
      console.log(`No new articles found on page ${currentPage}, stopping pagination check`);
      break;
    }
  }
  
  // Also try a new approach: directly access post URLs by incremental IDs
  console.log("Trying direct article ID approach...");
  
  // Get a list of all existing articles to avoid trying those again
  const existingArticles = await storage.getArticles();
  const existingUrls = new Set(existingArticles.map(article => article.url));
  const existingGuids = new Set(existingArticles.map(article => article.guid));
  
  console.log(`Avoiding ${existingUrls.size} already indexed URLs`);
  
  // Try a more strategic approach to find older articles
  // We'll prioritize known article slugs rather than guessing
  const baseUrl = "https://example.com/p/";
  
  // Create a list of example article slugs
  const confirmedSlugs = [
    // Example article slugs - replace with your content
    "getting-started-with-our-product",
    "ultimate-guide-to-productivity",
    "how-to-improve-team-collaboration",
    "best-practices-for-remote-work",
    "product-feature-announcement",
    "quarterly-industry-insights",
    "customer-success-stories",
    "upcoming-events-calendar",
    "frequently-asked-questions",
    "new-industry-trends", 
    "company-values-and-mission",
    "product-roadmap-preview",
    // Additional examples
    "beginner-friendly-tutorials",
    "advanced-tips-and-tricks",
    "troubleshooting-common-issues"
  ];
  
  // Only process the slugs we haven't already indexed
  const slugsToTry = confirmedSlugs.filter(slug => {
    const url = `${baseUrl}${slug}`;
    return !existingUrls.has(url) && !existingGuids.has(url);
  });
  
  console.log(`Will try ${slugsToTry.length} new article slugs from confirmed list`);
  
  // If we're hitting rate limits, we should implement more robust retry logic
  // with exponential backoff and limit our requests
  const MAX_REQUESTS_PER_RUN = 5;
  
  // If we have very few articles, also try additional examples - but only process 5 at a time
  // to avoid potential rate limits
  if (existingArticles.length < 30) {
    const additionalSlugs = [
      // Additional example articles - replace with your content
      "how-to-use-advanced-features",
      "integrating-with-other-tools",
      "customization-options",
      "pricing-plans-comparison",
      "security-best-practices"
    ];
    
    // Only add slugs we haven't already checked
    for (const slug of additionalSlugs) {
      const url = `${baseUrl}${slug}`;
      if (!existingUrls.has(url) && !existingGuids.has(url) && !slugsToTry.includes(slug)) {
        slugsToTry.push(slug);
        // Limit to 5 additional articles per run to avoid potential rate limits
        if (slugsToTry.length >= confirmedSlugs.length + 5) break;
      }
    }
  }
  
  // Process only a subset of slugs to avoid rate limiting
  const slugsToProcess = slugsToTry.slice(0, MAX_REQUESTS_PER_RUN);
  console.log(`Processing ${slugsToProcess.length} URLs this run (out of ${slugsToTry.length} total)`);
  
  for (const slug of slugsToProcess) {
    const url = `${baseUrl}${slug}`;
    console.log(`Trying direct URL: ${url}`);
    
    try {
      // Try to fetch article by constructing URL directly
      const title = slug.replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      // Implement exponential backoff for rate limiting
      let retryCount = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retryCount < maxRetries && !success) {
        try {
          // Add a longer delay between requests to avoid rate limiting
          if (retryCount > 0) {
            const backoffDelay = Math.pow(2, retryCount) * 2000; // Exponential backoff
            console.log(`Retry ${retryCount} for ${url}. Waiting ${backoffDelay}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoffDelay));
          }
          
          success = await processArticle(url, title, new Date().toISOString(), url);
          if (success) {
            totalArticlesAdded++;
            // Wait longer between successful requests
            await new Promise(resolve => setTimeout(resolve, 5000));
          }
        } catch (retryErr) {
          const errMsg = retryErr instanceof Error ? retryErr.message : 'Unknown error';
          // Only retry if we hit rate limits
          if (errMsg.includes('429') || errMsg.includes('Too Many Requests')) {
            retryCount++;
            console.log(`Rate limit hit, retry ${retryCount}/${maxRetries}`);
          } else {
            // Don't retry other errors
            throw retryErr;
          }
        }
      }
    } catch (err) {
      // Handle error safely without accessing potentially undefined properties
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`Failed to process ${url}: ${errorMessage}`);
      
      // Still add a delay after errors to be courteous to the server
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
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