// One-shot helper: applies a drizzle .sql file to the database in root .env.local.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// dotenv and postgres are dependencies of the server app, not the repo root.
const require = createRequire(path.join(process.cwd(), 'apps/server/package.json'));
const dotenv = require('dotenv');
const postgres = require('postgres');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, '.env.local') });

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/apply-migration.mjs <path/to/x.sql>');
  process.exit(1);
}

const sql = fs
  .readFileSync(path.resolve(root, file), 'utf8')
  .split('--> statement-breakpoint')
  .map((s) => s.trim())
  .filter(Boolean);

const client = postgres(process.env.DATABASE_URL, { prepare: false, ssl: 'require' });
try {
  const target = new URL(process.env.DATABASE_URL).host;
  for (const stmt of sql) {
    await client.unsafe(stmt);
    console.log('  applied:', stmt.slice(0, 70).replace(/\s+/g, ' '));
  }
  console.log(`done on ${target}`);
} finally {
  await client.end();
}