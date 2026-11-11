// The prompt catalog behind the MCP server: loads the site's data once per instance and searches it.
// Plain JavaScript so it runs as-is on Vercel and in local tests.
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const SITE = 'https://fillprompt.com';
const DATA = path.join(process.cwd(), 'src', 'data');
const read = (f) => JSON.parse(readFileSync(path.join(DATA, f), 'utf8'));

export const KINDS = ['image', 'video', 'text'];
const PATHS = { image: '/prompt/', video: '/video/', text: '/text-prompt/' };

const words = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 1);
const clip = (s, n) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

let cache;
/** All prompts as one flat list, with a lower-cased search text per field. */
export function catalog() {
  if (cache) return cache;
  const meta = read('meta.json');
  const items = [];
  for (const p of read('image-prompts.json'))
    items.push({ kind: 'image', ...p, tags: p.cats, media: p.images.slice(0, 2) });
  for (const v of read('video-prompts.json'))
    items.push({ kind: 'video', ...v, tags: [], media: [v.poster, v.video].filter(Boolean) });
  for (const t of read('text-prompts.json'))
    items.push({ kind: 'text', ...t, tags: [t.type, ...(t.forDevs ? ['developer'] : [])], media: [], likes: 0 });
  for (const x of items) {
    x.url = SITE + PATHS[x.kind] + x.slug;
    x.idx = {
      title: ' ' + words(x.title).join(' ') + ' ',
      tags: ' ' + [...x.tags, x.model].map((s) => words(s).join(' ')).join(' ') + ' ',
      desc: (x.desc || '').toLowerCase(),
      prompt: x.prompt.slice(0, 4000).toLowerCase(),
    };
  }
  const bySlug = new Map(items.map((x) => [x.kind + ':' + x.slug, x]));
  cache = { items, bySlug, sources: meta.sources, categories: meta.categories };
  return cache;
}

const norm = (s) => words(s || '').join(' ');

/** The type, model and category filters search() and random() share: a test for one item. */
function filter({ type, model, category }) {
  const m = norm(model);
  const c = norm(category);
  return (x) =>
    (!type || x.kind === type) && (!m || norm(x.model).includes(m)) && (!c || x.tags.some((t) => norm(t) === c));
}

/** Ranked search: title hits weigh most, then category/model, summary and prompt text. */
export function search({ query = '', type, model, category, limit = 8 }) {
  const { items } = catalog();
  const terms = [...new Set(words(query))];
  const keep = filter({ type, model, category });
  const scored = [];
  for (const x of items) {
    if (!keep(x)) continue;
    let score = 0;
    let hits = 0;
    for (const w of terms) {
      let s = 0;
      if (x.idx.title.includes(' ' + w)) s += 6;
      if (x.idx.tags.includes(' ' + w)) s += 3;
      if (x.idx.desc.includes(w)) s += 2;
      if (x.idx.prompt.includes(w)) s += 1;
      if (s) hits++;
      score += s;
    }
    if (terms.length && hits < Math.ceil(terms.length / 2)) continue;
    score += hits * 4; // matching more of the words beats matching one word many ways
    // Popularity only breaks ties between equally good matches.
    scored.push([score + Math.log10(1 + (x.likes || 0)) / 10, x]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  return { total: scored.length, results: scored.slice(0, limit).map(([, x]) => x) };
}

/** One prompt picked at random from those that pass the same filters as search(); undefined if none do. */
export function random({ type, model, category } = {}, pick = Math.random) {
  const matches = catalog().items.filter(filter({ type, model, category }));
  return matches.length ? matches[Math.floor(pick() * matches.length)] : undefined;
}

/** Find a prompt by its page URL or slug. */
export function find(ref, type) {
  const { bySlug } = catalog();
  const s = String(ref).trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  const m = s.match(/\/(prompt|video|text-prompt)\/([^/]+)$/);
  if (m) return bySlug.get({ prompt: 'image', video: 'video', 'text-prompt': 'text' }[m[1]] + ':' + m[2]);
  const slug = s.split('/').pop();
  for (const k of type ? [type] : KINDS) {
    const x = bySlug.get(k + ':' + slug);
    if (x) return x;
  }
}

/** Fill-in slots in a prompt: {argument name="x" default="y"}, ${name:default}, [PLACEHOLDER] and {placeholder}. */
export function slots(prompt) {
  const out = new Map();
  for (const m of prompt.matchAll(/\{argument name="([^"]+)" default="([^"]*)"\}/g)) out.set(m[1], m[2]);
  for (const m of prompt.matchAll(/\$\{([^}:]{1,40})(?::([^}]{0,80}))?\}/g)) out.set(m[1].trim(), (m[2] || '').trim());
  for (const m of prompt.matchAll(/\[([A-Z][A-Z0-9 _/-]{2,40})\]/g)) out.set(m[1], '');
  for (const m of prompt.matchAll(/\{([a-z][a-z0-9_ ]{2,30})\}/g)) out.set(m[1], '');
  return [...out].map(([name, example]) => ({ name, example }));
}

export const credit = (x) => {
  const src = catalog().sources[x.source];
  return {
    author: x.author || undefined,
    authorUrl: x.authorUrl || undefined,
    original: x.sourceUrl || undefined,
    collection: src ? `${src.name} by ${src.by} (${src.license})` : undefined,
    license: src?.licenseUrl,
  };
};

/** Short form used in search results. */
export const summary = (x) => ({
  title: x.title,
  type: x.kind,
  model: x.model,
  tags: x.tags,
  url: x.url,
  preview: clip(x.desc || x.prompt, 180),
  ...(x.media[0] ? { sample: x.media[0] } : {}),
});

/** Counts for the filters, so an agent can pick valid values. */
export function filters() {
  const { items, categories } = catalog();
  const count = (list) => list.reduce((a, k) => ((a[k] = (a[k] || 0) + 1), a), {});
  const of = (kind, f) => count(items.filter((x) => x.kind === kind).flatMap(f));
  const cats = of('image', (x) => x.tags);
  return {
    image: { total: items.filter((x) => x.kind === 'image').length, categories: Object.fromEntries(categories.filter((c) => cats[c]).map((c) => [c, cats[c]])), models: of('image', (x) => [x.model]) },
    video: { total: items.filter((x) => x.kind === 'video').length, models: of('video', (x) => [x.model]) },
    text: { total: items.filter((x) => x.kind === 'text').length, categories: of('text', (x) => x.tags), models: of('text', (x) => [x.model]) },
  };
}
