// Build a slim, gzipped prompt catalog for the MCP server (api/_catalog.js).
// Search indexes stay small and load first; full prompt bodies load per kind on demand.
// Usage: node scripts/mcp-catalog.mjs
// Also run at the end of `npm run import`.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = path.join(ROOT, 'src', 'data');
const OUT = path.join(DATA, 'mcp');

const KINDS = ['image', 'video', 'text'];
const words = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 1);
const clip = (s, n) => {
  const t = String(s || '')
    .replace(/\s+/g, ' ')
    .trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

const idx = (title, tags, desc, prompt) => ({
  title: ' ' + words(title).join(' ') + ' ',
  tags: ' ' + [...tags].map((s) => words(s).join(' ')).join(' ') + ' ',
  desc: (desc || '').toLowerCase(),
  // Prompt text ranks lowest in search; keep a short window to limit catalog size.
  prompt: (prompt || '').slice(0, 800).toLowerCase(),
});

async function readJson(name) {
  return JSON.parse(await readFile(path.join(DATA, name), 'utf8'));
}

function writeGz(name, data) {
  const raw = Buffer.from(JSON.stringify(data));
  const gz = gzipSync(raw, { level: 9 });
  return writeFile(path.join(OUT, name), gz).then(() => ({
    name,
    rawMB: +(raw.length / 1e6).toFixed(2),
    gzMB: +(gz.length / 1e6).toFixed(2),
  }));
}

function count(list) {
  return list.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {});
}

function buildFilters(kinds, categories) {
  const byKind = Object.fromEntries(kinds.map((k) => [k.kind, k]));
  const of = (kind, f) => count(byKind[kind].items.flatMap(f));
  const cats = of('image', (x) => x.tags);
  const vcats = of('video', (x) => x.tags);
  return {
    image: {
      total: byKind.image.items.length,
      categories: Object.fromEntries(categories.filter((c) => cats[c]).map((c) => [c, cats[c]])),
      models: of('image', (x) => [x.model]),
    },
    video: {
      total: byKind.video.items.length,
      categories: Object.fromEntries(Object.entries(vcats).filter(([c]) => c)),
      models: of('video', (x) => [x.model]),
    },
    text: {
      total: byKind.text.items.length,
      categories: of('text', (x) => x.tags),
      models: of('text', (x) => [x.model]),
    },
  };
}

function buildKind(kind, rows, map) {
  const search = [];
  const full = {};
  const items = [];
  for (const row of rows) {
    const x = map(row);
    items.push(x);
    search.push({
      slug: x.slug,
      title: x.title,
      model: x.model,
      tags: x.tags,
      likes: x.likes || 0,
      preview: clip(x.desc || x.prompt, 180),
      ...(x.media[0] ? { sample: x.media[0] } : {}),
      idx: idx(x.title, x.tags, x.desc, x.prompt),
    });
    full[x.slug] = {
      title: x.title,
      ...(x.desc ? { desc: x.desc } : {}),
      prompt: x.prompt,
      model: x.model,
      tags: x.tags,
      media: x.media,
      ...(x.author ? { author: x.author } : {}),
      ...(x.authorUrl ? { authorUrl: x.authorUrl } : {}),
      ...(x.sourceUrl ? { sourceUrl: x.sourceUrl } : {}),
      source: x.source,
      likes: x.likes || 0,
    };
  }
  return { kind, search, full, items };
}

export async function buildMcpCatalog() {
  const [images, videos, texts, meta] = await Promise.all([
    readJson('image-prompts.json'),
    readJson('video-prompts.json'),
    readJson('text-prompts.json'),
    readJson('meta.json'),
  ]);

  const built = [
    buildKind('image', images, (p) => ({
      slug: p.slug,
      title: p.title,
      desc: p.desc,
      prompt: p.prompt,
      model: p.model,
      tags: p.cats,
      likes: p.likes,
      media: (p.images || []).slice(0, 2),
      author: p.author,
      authorUrl: p.authorUrl,
      sourceUrl: p.sourceUrl,
      source: p.source,
    })),
    buildKind('video', videos, (v) => ({
      slug: v.slug,
      title: v.title,
      desc: v.desc,
      prompt: v.prompt,
      model: v.model,
      tags: v.cats || [],
      likes: v.likes,
      media: [v.poster, v.video].filter(Boolean),
      author: v.author,
      authorUrl: v.authorUrl,
      sourceUrl: v.sourceUrl,
      source: v.source,
    })),
    buildKind('text', texts, (t) => ({
      slug: t.slug,
      title: t.title,
      desc: t.desc,
      prompt: t.prompt,
      model: t.model,
      tags: [t.type, ...(t.forDevs ? ['developer'] : [])],
      likes: 0,
      media: [],
      author: t.author,
      authorUrl: t.authorUrl,
      sourceUrl: t.sourceUrl,
      source: t.source,
    })),
  ];

  await mkdir(OUT, { recursive: true });
  const written = [];
  written.push(
    await writeGz('meta.json.gz', {
      sources: meta.sources,
      categories: meta.categories,
      filters: buildFilters(built, meta.categories),
    }),
  );
  for (const k of built) {
    written.push(await writeGz(`search-${k.kind}.json.gz`, k.search));
    written.push(await writeGz(`full-${k.kind}.json.gz`, k.full));
  }

  const totals = KINDS.map((kind) => {
    const b = built.find((x) => x.kind === kind);
    return `${kind}=${b.items.length}`;
  }).join(' ');
  console.log(`mcp catalog: ${totals}`);
  for (const w of written) console.log(`  ${w.name}: ${w.rawMB} MB → ${w.gzMB} MB gz`);
  return written;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isCli) await buildMcpCatalog();
