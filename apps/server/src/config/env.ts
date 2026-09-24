import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env files in priority order (later calls don't override already-set vars).
// Priority: process.env > .env.local > .env
// We load highest-priority first, then lower-priority files fill in missing vars.
const monorepoRoot = path.resolve(__dirname, '../../../../');
const cwd = process.cwd();

// .env.local (highest priority — never committed to git)
dotenv.config({ path: path.resolve(monorepoRoot, '.env.local') });
dotenv.config({ path: path.resolve(cwd, '../../.env.local') });

// .env (base config — committed as .env.example, actual .env is git-ignored)
dotenv.config({ path: path.resolve(monorepoRoot, '.env') });
dotenv.config({ path: path.resolve(cwd, '../../.env') });
dotenv.config(); // fallback: cwd/.env

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database — required in all environments
  DATABASE_URL: z.string().url(),

  // Redis — optional with single-node memory fallback
  REDIS_URL: z.string().optional(),

  // Auth — secret required; Google OAuth optional
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url().default('http://localhost:3001'),

  // Google OAuth: optional in dev and prod
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Frontend URL (used for CORS & OAuth redirects)
  VITE_APP_URL: z.string().url().default('http://localhost:3000'),
});

const _env = envSchema.parse(process.env);

if (_env.NODE_ENV === 'production') {
  if (!_env.GOOGLE_CLIENT_ID || !_env.GOOGLE_CLIENT_SECRET) {
    console.warn(
      '[env] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set in production. ' +
      'Google OAuth will be disabled until credentials are provided.'
    );
  }
}

export const env = _env;
