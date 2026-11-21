// Search index row shape used by /search and QuickFilter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const images = read('src/data/image-prompts.json');
const videos = read('src/data/video-prompts.json');
const texts = read('src/data/text-prompts.json');
const meta = read('src/data/meta.json');

// Mirror src/pages/search/[kind].json.ts without importing Astro route modules.
const excerpt = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + '…');
const imageRow = (p) => [
  p.title,
  p.slug,
  p.cats[0],
  p.images[0],
  excerpt(p.prompt, 110),
  p.model === 'Any image model' ? '' : p.model,
  p.source,
  ...p.cats.slice(1),
];
const videoRow = (v) => [v.title, v.slug, v.model, v.poster, excerpt(v.prompt, 160), v.poster ? '' : v.video, v.source];
const textRow = (t) => [t.title, t.slug, t.model, t.type, t.source, excerpt(t.prompt, 120)];

test('search image rows keep source at index 6', () => {
  const r = imageRow(images[0]);
  assert.equal(r[6], images[0].source);
  assert.ok(meta.sources[r[6]]);
});

test('search video rows keep source at index 6', () => {
  const r = videoRow(videos[0]);
  assert.equal(r[6], videos[0].source);
  assert.ok(meta.sources[r[6]]);
});

test('search text rows keep source at index 4', () => {
  const r = textRow(texts[0]);
  assert.equal(r[4], texts[0].source);
  assert.ok(meta.sources[r[4]]);
});

test('Search and QuickFilter wire source: parsing and display names', () => {
  const search = readFileSync('src/views/Search.astro', 'utf8');
  assert.match(search, /sourceNames/);
  assert.match(search, /sourceLabel/);
  assert.match(search, /source\|in/);
  assert.match(search, /sourceLabel\(r\[6\]\)/);

  const qf = readFileSync('src/components/QuickFilter.astro', 'utf8');
  assert.match(qf, /sourceNames/);
  assert.match(qf, /source\|in/);
  assert.match(qf, /parseQuery/);
  assert.match(qf, /loadFailed/);

  const sourcePage = readFileSync('src/views/Source.astro', 'utf8');
  assert.match(sourcePage, /searchCollection/);
  assert.match(sourcePage, /source:\$\{source\.key\}|source:\$\{encodeURIComponent/);
});
