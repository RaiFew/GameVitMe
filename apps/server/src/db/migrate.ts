/**
 * Database Migration Runner
 *
 * Run with: pnpm db:migrate
 *
 * This applies all pending SQL migration files from the `drizzle/` directory
 * to the database specified by DATABASE_URL. Migrations are tracked in the
 * `__drizzle_migrations` table so they only run once.
 *
 * Safe to run multiple times — already-applied migrations are skipped.
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files — same priority order as env.ts
const monorepoRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.resolve(monorepoRoot, '.env.local') });
dotenv.config({ path: path.resolve(monorepoRoot, '.env') });
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('[migrate] ❌ DATABASE_URL is not set.');
  console.error('         Copy .env.example to .env and set your DATABASE_URL.');
  process.exit(1);
}

console.log('[migrate] 🔌 Connecting to database...');
console.log(`[migrate]    ${DATABASE_URL.replace(/:\/\/[^@]+@/, '://***@')}`); // mask credentials

// Use a single connection for migrations (not a pool)
const migrationClient = postgres(DATABASE_URL, {
  max: 1,
  prepare: false, // required for Supabase Transaction pooler
});

const db = drizzle(migrationClient);
const migrationsFolder = path.resolve(__dirname, '../../drizzle');

try {
  console.log('[migrate] 📦 Running migrations...');
  await migrate(db, { migrationsFolder });
  console.log('[migrate] ✅ All migrations applied successfully.');
} catch (err) {
  console.error('[migrate] ❌ Migration failed:', err);
  process.exit(1);
} finally {
  await migrationClient.end();
}
