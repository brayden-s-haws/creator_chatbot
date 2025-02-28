import fs from "fs/promises";
import path from "path";

// Data directory
const dataDir = path.join(process.cwd(), "data");

/**
 * Ensure data directory exists
 */
export async function ensureDataDir(): Promise<void> {
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
    throw error;
  }
}

/**
 * Save data to a JSON file
 */
export async function saveJsonToFile<T>(filename: string, data: T): Promise<void> {
  try {
    // Ensure data directory exists
    await ensureDataDir();
    
    // Create file path
    const filePath = path.join(dataDir, filename);
    
    // Write data to file
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error(`Error saving data to ${filename}:`, error);
    throw error;
  }
}

/**
 * Load data from a JSON file
 */
export async function loadJsonFromFile<T>(filename: string, defaultValue: T): Promise<T> {
  try {
    // Create file path
    const filePath = path.join(dataDir, filename);
    
    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      // File doesn't exist, return default value
      return defaultValue;
    }
    
    // Read and parse data
    const content = await fs.readFile(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    console.error(`Error loading data from ${filename}:`, error);
    return defaultValue;
  }
}
