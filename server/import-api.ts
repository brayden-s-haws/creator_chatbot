import { importArticlesFromCsv } from '../scripts/import-from-csv';
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { ensureDataDir } from './file-persister';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureDataDir();
    cb(null, path.join(process.cwd(), 'data'));
  },
  filename: (req, file, cb) => {
    // Use timestamp to ensure unique names
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'articles-' + uniqueSuffix + '.csv');
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit to 10MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only csv files
    if (file.mimetype === 'text/csv' || 
        file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * Handle CSV file upload for article import
 */
export async function handleCsvUpload(req: Request, res: Response) {
  try {
    // Process the uploaded file
    const uploadMiddleware = upload.single('file');
    
    uploadMiddleware(req, res, async (err) => {
      if (err) {
        console.error('Error uploading file:', err);
        return res.status(400).json({ 
          success: false, 
          message: err.message || 'Error uploading file' 
        });
      }
      
      if (!req.file) {
        return res.status(400).json({ 
          success: false, 
          message: 'No file uploaded' 
        });
      }
      
      const filePath = req.file.path;
      console.log(`Processing uploaded CSV file: ${filePath}`);
      
      // Send immediate response to prevent timeout
      res.json({
        success: true,
        message: 'File uploaded successfully. Processing will continue in the background.',
        filename: req.file.originalname,
        inProgress: true
      });
      
      // Process the CSV file in the background
      importArticlesFromCsv(filePath)
        .then(result => {
          console.log(`CSV import completed. Added ${result.articlesAdded} articles and ${result.chunksAdded} chunks.`);
          
          // Clean up the uploaded file
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Error deleting uploaded file ${filePath}:`, unlinkErr);
            }
          });
        })
        .catch(importErr => {
          console.error('Error processing CSV file:', importErr);
          
          // Still try to clean up on error
          fs.unlink(filePath, (unlinkErr) => {
            if (unlinkErr) {
              console.error(`Error deleting uploaded file ${filePath}:`, unlinkErr);
            }
          });
        });
    });
  } catch (error) {
    console.error('Unexpected error in handleCsvUpload:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error processing upload' 
    });
  }
}

/**
 * Process a CSV file that's already on the server
 */
export async function processExistingCsvFile(req: Request, res: Response) {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({ 
        success: false, 
        message: 'Filename is required' 
      });
    }
    
    // Ensure file is within the data directory for security
    const filePath = path.join(process.cwd(), 'data', filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        message: `File not found: ${filename}` 
      });
    }
    
    // Send immediate response to prevent timeout
    res.json({
      success: true,
      message: 'Processing started. This will continue in the background.',
      filename,
      inProgress: true
    });
    
    // Process the CSV file in the background
    importArticlesFromCsv(filePath)
      .then(result => {
        console.log(`CSV import from existing file completed. Added ${result.articlesAdded} articles and ${result.chunksAdded} chunks.`);
      })
      .catch(importErr => {
        console.error(`Error processing existing CSV file ${filePath}:`, importErr);
      });
      
  } catch (error) {
    console.error('Unexpected error in processExistingCsvFile:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Server error processing file' 
    });
  }
}