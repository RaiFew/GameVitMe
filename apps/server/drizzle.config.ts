import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';

const monorepoRoot = path.resolve(__dirname, '../../');

// Load .env.local first (higher priority), then .env as fallback
dotenv.config({ path: path.join(monorepoRoot, '.env.local') });
dotenv.config({ path: path.join(monorepoRoot, '.env') });

if (!process.env.DATABASE_URL) {
  throw new Error('[drizzle] DATABASE_URL is not set. Copy .env.example to .env.local and fill it in.');
}

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});

