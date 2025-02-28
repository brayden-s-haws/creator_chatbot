import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { importArticlesFromCsv } from '../scripts/import-from-csv';
import { v4 as uuidv4 } from 'uuid';
import { storage } from './storage';

// Configure multer for temporary file storage
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'data', 'uploads');
      // Create directory if it doesn't exist
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      // Generate unique filename to prevent collisions
      const uniqueName = `${Date.now()}-${uuidv4()}-${file.originalname}`;
      cb(null, uniqueName);
    }
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Only accept CSV files
    if (file.mimetype !== 'text/csv' && !file.originalname.endsWith('.csv')) {
      return cb(new Error('Only CSV files are allowed'));
    }
    cb(null, true);
  }
});

/**
 * Handle CSV file upload for article import
 */
export async function handleCsvUpload(req: Request, res: Response) {
  try {
    // Use multer to process the file upload
    const uploadMiddleware = upload.single('file');
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('File upload error:', err);
        return res.status(400).send({ 
          success: false, 
          message: err.message || 'Error uploading file' 
        });
      }
      
      // Check if a file was uploaded
      if (!req.file) {
        return res.status(400).send({ 
          success: false, 
          message: 'No file was uploaded' 
        });
      }
      
      // Process the CSV file in the background
      const filePath = req.file.path;
      console.log(`CSV file uploaded: ${filePath}`);
      
      // Start background processing
      processCsvInBackground(filePath);
      
      // Return success immediately
      res.status(200).send({ 
        success: true, 
        message: 'File uploaded successfully. Processing started in background.',
        filePath: req.file.originalname
      });
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).send({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error processing upload' 
    });
  }
}

/**
 * Process a CSV file that's already on the server
 */
export async function processExistingCsvFile(req: Request, res: Response) {
  try {
    // For a demo/sample import, use the sample file path
    const sampleFilePath = path.join(process.cwd(), 'data', 'sample-articles.csv');
    
    // Check if sample file exists
    if (!fs.existsSync(sampleFilePath)) {
      return res.status(404).send({ 
        success: false, 
        message: 'Sample file not found' 
      });
    }
    
    // Start background processing
    processCsvInBackground(sampleFilePath);
    
    res.status(200).send({ 
      success: true, 
      message: 'Sample import started in background'
    });
  } catch (error) {
    console.error('Sample import error:', error);
    res.status(500).send({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error processing sample import' 
    });
  }
}

/**
 * Process CSV file in a background process
 */
async function processCsvInBackground(filePath: string) {
  try {
    console.log(`Starting background processing of CSV file: ${filePath}`);
    
    // Update system status to indicate processing is in progress
    await storage.updateSystemStatus({
      lastUpdated: new Date().toISOString(),
      nextUpdate: 'CSV import in progress'
    });
    
    // Process the CSV file
    setTimeout(async () => {
      try {
        console.log('Background CSV processing started');
        const result = await importArticlesFromCsv(filePath);
        
        console.log(`Background processing completed: ${result.articlesAdded} articles, ${result.chunksAdded} chunks`);
        
        // Clean up the temporary file if it's in the uploads directory
        if (filePath.includes('uploads')) {
          fs.unlinkSync(filePath);
          console.log(`Deleted temporary file: ${filePath}`);
        }
        
        // Update system status
        await storage.updateSystemStatus({
          lastUpdated: new Date().toISOString(),
          articlesIndexed: (await storage.getArticles()).length
        });
      } catch (processError) {
        console.error('Error in background CSV processing:', processError);
      }
    }, 100); // Start after a small delay
    
  } catch (error) {
    console.error('Background processing error:', error);
  }
}