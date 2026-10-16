// Copies the built game (dist/) into the Kids Table website so it ships at yourdomain.com/game/.
// Usage:  npm run build && npm run copy:kt   (then deploy the Kids Table site as usual)
// Optional: KT_DIR=path/to/KTWebsite npm run copy:kt
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const dist = path.join(root, 'dist');
const kt = path.resolve(process.env.KT_DIR || path.join(root, '..', 'KTWebsite'));
const target = path.join(kt, 'public', 'game');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  console.error('No build found. Run `npm run build` first.');
  process.exit(1);
}
if (!fs.existsSync(path.join(kt, 'package.json'))) {
  console.error(`Kids Table site not found at ${kt}. Set KT_DIR to its folder.`);
  process.exit(1);
}
fs.rmSync(target, { recursive: true, force: true });
fs.mkdirSync(target, { recursive: true });
fs.cpSync(dist, target, { recursive: true });
console.log(`Copied game build -> ${target}`);
console.log('Next: make sure KTWebsite/firebase.json has the /game rewrites (see DEPLOY.md), then run its deploy.');
