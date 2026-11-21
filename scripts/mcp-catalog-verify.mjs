// Verify committed MCP gzip files match a fresh rebuild (JSON content, not gzip bytes).
// Gzip headers can differ across OS; CI should not fail on that.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildMcpCatalog } from './mcp-catalog.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MCP = path.join(ROOT, 'src', 'data', 'mcp');

const load = async (dir, name) => JSON.parse(gunzipSync(await readFile(path.join(dir, name))));

const before = {};
const committed = {};
for (const name of (await readdir(MCP)).filter((f) => f.endsWith('.gz')).sort()) {
  before[name] = await load(MCP, name);
  committed[name] = await readFile(path.join(MCP, name));
}

await buildMcpCatalog();

let drift = 0;
for (const name of Object.keys(before).sort()) {
  const after = await load(MCP, name);
  if (JSON.stringify(before[name]) !== JSON.stringify(after)) {
    console.error('content drift:', name);
    drift++;
  }
}

// Restore committed gzip bytes so the working tree stays clean for later steps.
for (const [name, buf] of Object.entries(committed)) {
  await writeFile(path.join(MCP, name), buf);
}

if (drift) {
  console.error(`${drift} MCP catalog file(s) differ in JSON content from a fresh rebuild.`);
  process.exit(1);
}
console.log('mcp catalog JSON matches committed files');
