import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const publicDir = path.join(rootDir, 'public');

// Validate server syntax
execFileSync(process.execPath, ['--check', path.join(rootDir, 'server.js')], {
  stdio: 'inherit',
});

// Rebuild dist directory for static hosting (Vercel / CDN)
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });

fs.copyFileSync(path.join(rootDir, 'index.html'), path.join(distDir, 'index.html'));

if (fs.existsSync(publicDir)) {
  fs.cpSync(publicDir, distDir, { recursive: true });
}

console.log('Built static output in dist/');
