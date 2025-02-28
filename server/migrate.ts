
import { getDb, initDb, closeDb } from './db';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

async function runMigration() {
  console.log('Running migrations...');
  const db = initDb();
  
  if (!db) {
    console.error('Database connection failed. Cannot run migrations.');
    process.exit(1);
  }
  
  try {
    // Run migrations
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await closeDb();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('Migration process completed');
    process.exit(0);
  })
  .catch(err => {
    console.error('Migration process failed:', err);
    process.exit(1);
  });
