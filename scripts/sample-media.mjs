// Spot-check that sample image and video URLs still answer HTTP HEAD.
// Usage: node scripts/sample-media.mjs
//        node scripts/sample-media.mjs --limit 40
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const PER_SOURCE = Number(limitArg?.split('=')[1] || process.argv[process.argv.indexOf('--limit') + 1]) || 12;
const TIMEOUT_MS = 12_000;
const FAIL_RATIO = 0.12;

const read = async (name) => JSON.parse(await readFile(path.join(DATA, name), 'utf8'));

async function head(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal });
    // Some CDNs reject HEAD; fall back to a ranged GET.
    if (res.status === 405 || res.status === 403) {
      res = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-0' },
        redirect: 'follow',
        signal: ctrl.signal,
      });
    }
    return res.status;
  } catch (e) {
    return e.name === 'AbortError' ? 'timeout' : 'error';
  } finally {
    clearTimeout(t);
  }
}

function sampleBySource(list, urlOf) {
  const by = new Map();
  for (const x of list) {
    const u = urlOf(x);
    if (!u || !/^https?:\/\//i.test(u)) continue;
    if (!by.has(x.source)) by.set(x.source, []);
    by.get(x.source).push({ source: x.source, slug: x.slug, url: u });
  }
  const out = [];
  for (const [, rows] of by) {
    const step = Math.max(1, Math.floor(rows.length / PER_SOURCE));
    for (let i = 0; i < rows.length && out.filter((r) => r.source === rows[0].source).length < PER_SOURCE; i += step) {
      out.push(rows[i]);
    }
  }
  return out;
}

const images = await read('image-prompts.json');
const videos = await read('video-prompts.json');
const checks = [
  ...sampleBySource(images, (p) => p.images?.[0]).map((x) => ({ ...x, kind: 'image' })),
  ...sampleBySource(videos, (v) => v.video || v.poster).map((x) => ({ ...x, kind: 'video' })),
];

console.log(`Checking ${checks.length} sample media URLs (${PER_SOURCE}/source)…`);
const bad = [];
for (const c of checks) {
  const status = await head(c.url);
  const ok = typeof status === 'number' && status >= 200 && status < 400;
  if (!ok) {
    bad.push({ ...c, status });
    console.log('FAIL', status, c.kind, c.source, c.slug);
  }
}

const ratio = bad.length / Math.max(1, checks.length);
console.log(`Done: ${checks.length - bad.length}/${checks.length} ok, ${bad.length} failed (${(ratio * 100).toFixed(1)}%)`);
if (ratio > FAIL_RATIO) {
  console.error(`Failure rate ${(ratio * 100).toFixed(1)}% exceeds ${(FAIL_RATIO * 100).toFixed(0)}% threshold.`);
  process.exit(1);
}
