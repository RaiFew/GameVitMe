import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const localDist = path.resolve(__dirname, '../dist');
const rootDist = path.resolve(__dirname, '../../../dist');

if (fs.existsSync(localDist)) {
  fs.mkdirSync(rootDist, { recursive: true });
  fs.cpSync(localDist, rootDist, { recursive: true });
  console.log('[copy-dist] Successfully copied apps/web/dist to root dist for Vercel');
}
