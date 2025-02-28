
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from '../shared/schema';

const { Pool } = pg;

// Initialize PostgreSQL client
let pool: Pool | null = null;

export function initDb() {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set, using file-based storage');
    return null;
  }
  
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5
    });
    
    console.log('Connected to PostgreSQL database');
    return drizzle(pool, { schema });
  } catch (error) {
    console.error('Failed to connect to database:', error);
    return null;
  }
}

export function getDb() {
  if (!pool) {
    return initDb();
  }
  return drizzle(pool, { schema });
}

// Close database connection
export async function closeDb() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
