import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.resolve(__dirname, '../apps/web/dist');
const target = path.resolve(__dirname, '../dist');

if (fs.existsSync(source)) {
  fs.mkdirSync(target, { recursive: true });
  fs.cpSync(source, target, { recursive: true });
  console.log('[postbuild] Successfully mirrored apps/web/dist to ./dist for Vercel');
} else {
  console.warn('[postbuild] Warning: apps/web/dist does not exist yet');
}
