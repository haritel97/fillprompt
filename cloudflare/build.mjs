// After `astro build`: prepares dist/ for Cloudflare Workers static assets.
// - dist/_redirects and dist/_headers from vercel.json, so the two hosts behave the same. The host
//   redirects (www.fillprompt.com, mytemplate.my) are Redirect Rules on the Cloudflare zones instead.
// - dist/_mcp/: the MCP catalog as plain JSON for the Worker (cloudflare/worker.js), with the full
//   records split into shards and long prompts put back in, so one get_prompt reads one small file.
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { KINDS } from '../api/_catalog.js';
import { SHARDS, shard } from './shard.js';

const root = path.resolve(import.meta.dirname, '..');
const dist = path.join(root, 'dist');
const source = path.join(root, 'src', 'data', 'mcp');
const vercel = JSON.parse(await readFile(path.join(root, 'vercel.json'), 'utf8'));
const readGz = async (f) => JSON.parse(gunzipSync(await readFile(path.join(source, f))));

// Redirects: ":path*" becomes "*" and ":splat". Host-based rules ("has") are left to the zones.
const redirects = vercel.redirects
  .filter((r) => !r.has)
  .map((r) => {
    const from = r.source.replace(/:\w+\*$/, '*');
    const to = r.destination.replace(/:\w+\*$/, ':splat');
    if (/[:(]/.test(from)) throw new Error(`Redirect pattern not supported on Cloudflare: ${r.source}`);
    return `${from} ${to} ${r.permanent ? 301 : 302}`;
  });
await writeFile(path.join(dist, '_redirects'), redirects.join('\n') + '\n');

// Headers: "/(.*)" becomes "/*", "/_astro/(.*)" becomes "/_astro/*", "/search/(.*).json" becomes "/search/*"
// (that folder holds only the .json indexes; the search page itself is /search).
const pattern = (s) => s.replace(/\(\.\*\)(\.json)?$/, '*');
const blocks = vercel.headers.map((h) => [pattern(h.source), h.headers]);
blocks.push(['/_mcp/*', [{ key: 'X-Robots-Tag', value: 'noindex' }]]);
await writeFile(
  path.join(dist, '_headers'),
  blocks.map(([at, list]) => `${at}\n${list.map((h) => `  ${h.key}: ${h.value}`).join('\n')}\n`).join('\n'),
);

const out = path.join(dist, '_mcp');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await writeFile(path.join(out, 'meta.json'), JSON.stringify(await readGz('meta.json.gz')));
let files = 1;
for (const kind of KINDS) {
  await writeFile(path.join(out, `search-${kind}.json`), JSON.stringify(await readGz(`search-${kind}.json.gz`)));
  const full = await readGz(`full-${kind}.json.gz`);
  const xl = (await readdir(source)).includes(`full-${kind}-xl.json.gz`) ? await readGz(`full-${kind}-xl.json.gz`) : {};
  const shards = Array.from({ length: SHARDS }, () => ({}));
  for (const [slug, body] of Object.entries(full)) {
    shards[Number(shard(slug))][slug] = body.xl ? { ...body, prompt: xl[slug]?.prompt || body.prompt } : body;
  }
  await mkdir(path.join(out, `full-${kind}`));
  for (let i = 0; i < SHARDS; i++) {
    await writeFile(path.join(out, `full-${kind}`, `${String(i).padStart(2, '0')}.json`), JSON.stringify(shards[i]));
  }
  files += 1 + SHARDS;
}
console.log(`Cloudflare: ${redirects.length} redirects, ${blocks.length} header rules, ${files} catalog files in dist/_mcp.`);
