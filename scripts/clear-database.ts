
import { db, testDatabaseConnection } from "../server/db";
import * as schema from "../shared/schema";
import { log } from "../server/vite";

async function clearDatabase() {
  try {
    // Ensure database connection is working
    const connected = await testDatabaseConnection();
    if (!connected) {
      console.error("Database connection failed. Cannot clear tables.");
      process.exit(1);
    }

    console.log("Connected to database. Clearing all tables...");

    // Clear all tables in reverse order to respect foreign key constraints
    await db.delete(schema.vectorDocuments);
    console.log("Cleared vector_documents table");
    
    await db.delete(schema.queries);
    console.log("Cleared queries table");
    
    await db.delete(schema.contentChunks);
    console.log("Cleared content_chunks table");
    
    await db.delete(schema.articles);
    console.log("Cleared articles table");

    console.log("All database tables have been cleared successfully.");
  } catch (error) {
    console.error("Error clearing database:", error);
  } finally {
    process.exit(0);
  }
}

// Run the function
clearDatabase();
