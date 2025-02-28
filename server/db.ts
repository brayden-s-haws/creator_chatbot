import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
const { Pool } = pg;
import * as schema from "@shared/schema";
import { log } from "./vite";

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Create a drizzle instance
export const db = drizzle(pool, { schema });

// Simple function to test database connection
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    log("Database connection successful", "db");
    return true;
  } catch (error: any) {
    log(`Database connection failed: ${error.message}`, "db");
    return false;
  }
}