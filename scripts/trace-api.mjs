// Prints (one per line, relative to the repo root) every file the compiled API
// loads at runtime, by statically tracing requires/imports from dist/main.js.
// Handles native addons (node-gyp-build) and literal dynamic imports (Prisma's
// wasm query compiler). Used by package-api.sh to build a minimal Lambda zip.
import { nodeFileTrace } from '@vercel/nft';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const entry = path.join(root, 'apps/api/dist/main.js');

const { fileList, warnings } = await nodeFileTrace([entry], { base: root });

for (const w of warnings) {
  // Unresolvable optional requires (e.g. Nest's optional microservices) are expected.
  if (process.env.DEBUG_TRACE) console.error(`trace warning: ${w.message}`);
}
for (const file of [...fileList].sort()) console.log(file);
