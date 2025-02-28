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
  // Construct URL differently for different pages
  // Direct method:
  const url = pageNumber === 1 
    ? ARCHIVE_URL 
    : `${ARCHIVE_URL}?page=${pageNumber}`;
    
  // Try an alternative URL format as well (sometimes Substack uses a different structure)
  const alternativeUrl = pageNumber === 1
    ? ARCHIVE_URL
    : `${SUBSTACK_URL}/archive/${pageNumber}`;
  
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
      const fullUrl = href.startsWith('http') ? href : `${SUBSTACK_URL}${href.startsWith('/') ? href : `/${href}`}`;
      
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
      if (fullUrl.includes(SUBSTACK_URL) || fullUrl.includes('runthebusiness')) {
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
        const linkElement = post.find('a[href*="/p/"], a[href*="runthebusiness"], a');
        const dateElement = post.find('time, [datetime], .date, .post-date');
        
        const title = titleElement.text().trim() || `Article ${i+1}`;
        const link = linkElement.attr('href');
        
        // Skip if no link or already processed
        if (!link || processedUrls.has(link)) {
          continue;
        }
        
        const fullLink = link.startsWith('http') ? link : `${SUBSTACK_URL}${link.startsWith('/') ? link : `/${link}`}`;
        
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
        
        if (title && fullLink && (fullLink.includes(SUBSTACK_URL) || fullLink.includes('runthebusiness'))) {
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
  
  console.log("Starting to fetch more articles from Substack archive...");
  
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
    
    // Add a delay to avoid overloading the server
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // If we didn't add any articles on this page and we're past page 2, we can stop
    // (page 1 might be just recent articles we already have)
    if (result.articles === 0 && currentPage > 2) {
      console.log(`No new articles found on page ${currentPage}, stopping pagination check`);
      break;
    }
  }
  
  // Also try a new approach: directly access post URLs by incremental IDs
  console.log("Trying direct article ID approach...");
  
  // Substack often uses sequential IDs for posts
  // Try a range of IDs to find older articles
  const baseUrl = "https://runthebusiness.substack.com/p/";
  const slugsToTry = [
    // These are known article slugs from the blog
    "invisible-career-asymptotes-part-1",
    "creating-an-innovation-culture",
    "why-youll-always-end-up-building-a-workflow",
    "why-platform-ify",
    "building-hardware",
    "the-executive-mindset",
    "when-the-users-were-right-all-along",
    "upcoming-events-in-august",
    "building-a-culture-of-innovation",
    "organizing-knowledge-workers",
    "managing-vs-making",
    "aligning-high-performing-teams",
    "how-to-prepare-for-product-manager-interviews",
    "the-role-of-product-leadership",
    // Additional potential article slugs
    "the-product-managers-playbook",
    "prioritizing-product-features",
    "product-strategy-essentials",
    "developing-customer-empathy",
    "cross-functional-team-leadership",
    "scaling-product-teams",
    "product-launch-checklist",
    "growth-metrics-that-matter",
    "user-feedback-frameworks",
    "roadmap-planning-techniques",
    "from-idea-to-execution",
    "managing-stakeholder-expectations",
    "data-driven-product-decisions",
    "user-research-methods",
    "building-a-product-vision",
    "value-proposition-design",
    "pricing-strategies-for-products",
    "agile-product-development",
    "product-analytics-fundamentals",
    "customer-journey-mapping"
  ];
  
  for (const slug of slugsToTry) {
    const url = `${baseUrl}${slug}`;
    console.log(`Trying direct URL: ${url}`);
    
    try {
      // Try to fetch article by constructing URL directly
      const title = slug.replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      const success = await processArticle(url, title, new Date().toISOString(), url);
      if (success) {
        totalArticlesAdded++;
      }
      
      // Add a delay to avoid overloading the server
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      // Handle error safely without accessing potentially undefined properties
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.log(`Failed to process ${url}: ${errorMessage}`);
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