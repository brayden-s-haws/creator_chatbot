import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { v4 as uuidv4 } from 'uuid';
import { createEmbedding } from '../server/embeddings';
import { storage } from '../server/storage';
import { addDocumentToVectorStore } from '../server/vector-store';
import { splitContentIntoChunks } from '../server/rss-processor';

interface ArticleRow {
  title: string;
  url: string;
  text: string;
  // Optional fields
  pubDate?: string;
  guid?: string;
}

/**
 * Import articles from a CSV file
 * Expected CSV format: title,url,text,pubDate(optional),guid(optional)
 */
export async function importArticlesFromCsv(csvFilePath: string): Promise<{
  articlesAdded: number;
  chunksAdded: number;
  errors: string[];
}> {
  console.log(`Starting import from CSV file: ${csvFilePath}`);

  if (!fs.existsSync(csvFilePath)) {
    throw new Error(`CSV file not found: ${csvFilePath}`);
  }

  // Read and parse CSV file
  const fileContent = fs.readFileSync(csvFilePath, 'utf8');
  const records = parse(fileContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  }) as ArticleRow[];

  console.log(`Found ${records.length} articles in CSV file`);

  // Get existing articles to avoid duplicates
  const existingArticles = await storage.getArticles();
  const existingUrls = new Set(existingArticles.map(article => article.url));
  const existingGuids = new Set(existingArticles.map(article => article.guid));

  let articlesAdded = 0;
  let chunksAdded = 0;
  const errors: string[] = [];

  // Process each article
  for (let index = 0; index < records.length; index++) {
    const record = records[index];
    try {
      console.log(`Processing article ${index + 1}/${records.length}: ${record.title}`);
      
      // Skip if article already exists
      if (existingUrls.has(record.url) || 
          (record.guid && existingGuids.has(record.guid))) {
        console.log(`Article already exists, skipping: ${record.title}`);
        continue;
      }

      // Set default values for optional fields
      const pubDate = record.pubDate || new Date().toISOString();
      const guid = record.guid || record.url;
      
      // Create article record in database
      const article = await storage.createArticle({
        title: record.title,
        url: record.url,
        content: record.text || '',
        publishedAt: new Date(pubDate),
        guid: guid,
      });
      
      console.log(`Article added: ${article.title} (ID: ${article.id})`);
      articlesAdded++;
      
      // Process content into chunks
      const content = record.text || '';
      if (!content) {
        console.warn(`Warning: Empty content for article: ${record.title}`);
        continue;
      }
      
      console.log(`Splitting content into chunks (${content.length} characters)`);
      const chunks = splitContentIntoChunks(content);
      console.log(`Generated ${chunks.length} content chunks`);
      
      // Process each chunk
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        const chunkContent = chunks[chunkIndex];
        try {
          console.log(`Processing chunk ${chunkIndex + 1}/${chunks.length} for article ID ${article.id}`);
          
          // Create embedding for this chunk
          const embedding = await createEmbedding(chunkContent);
          
          // Create content chunk in database
          const chunk = await storage.createContentChunk({
            articleId: article.id,
            content: chunkContent,
            embedding: embedding,
          });
          
          // Add to vector store
          await addDocumentToVectorStore({
            id: uuidv4(),
            content: chunkContent,
            embedding: embedding,
            metadata: {
              articleId: article.id,
              title: article.title,
              url: article.url,
            }
          });
          
          chunksAdded++;
        } catch (chunkError) {
          const errorMessage = chunkError instanceof Error 
            ? chunkError.message 
            : 'Unknown error processing chunk';
          console.error(`Error processing chunk ${chunkIndex + 1} for article ${article.title}: ${errorMessage}`);
          errors.push(`Failed to process chunk ${chunkIndex + 1} for ${article.title}: ${errorMessage}`);
        }
      }
      
      // Add a small delay between articles to avoid rate limiting on embedding API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (articleError) {
      const errorMessage = articleError instanceof Error 
        ? articleError.message 
        : 'Unknown error processing article';
      console.error(`Error processing article ${record.title}: ${errorMessage}`);
      errors.push(`Failed to process ${record.title}: ${errorMessage}`);
    }
  }
  
  // Update system status
  const now = new Date();
  await storage.updateSystemStatus({
    lastUpdated: now.toISOString(),
    articlesIndexed: (await storage.getArticles()).length
  });
  
  console.log(`CSV import completed. Added ${articlesAdded} articles and ${chunksAdded} chunks.`);
  console.log(`Encountered ${errors.length} errors.`);
  
  if (errors.length > 0) {
    console.log("Error summary:");
    errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error}`);
    });
  }
  
  return {
    articlesAdded,
    chunksAdded,
    errors
  };
}