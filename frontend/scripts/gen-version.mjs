// Writes public/version.json with a fresh id on every build. Vite
// copies everything in public/ into dist/ unchanged, so this file
// ships as-is and is what lib/appVersion.js polls at runtime to
// detect a new deploy and auto-reload.
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'public');
const version = String(Date.now());

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'version.json'), JSON.stringify({ version }));
console.log('version.json ->', version);
