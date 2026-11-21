// The prompt catalog behind the MCP server.
// Loads a slim gzipped search index first; full prompt bodies load per kind on demand.
// Built by `node scripts/mcp-catalog.mjs` into src/data/mcp/.
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import path from 'node:path';
import { variants } from '../src/lib/synonyms.mjs';

export const SITE = 'https://fillprompt.com';
export const KINDS = ['image', 'video', 'text'];
const PATHS = { image: '/prompt/', video: '/video/', text: '/text-prompt/' };
const MCP = path.join(process.cwd(), 'src', 'data', 'mcp');

const words = (s) => (s.toLowerCase().match(/[a-z0-9]+/g) || []).filter((w) => w.length > 1);
const readGz = (f) => JSON.parse(gunzipSync(readFileSync(path.join(MCP, f))));

let metaCache;
const searchCache = Object.create(null);
const fullCache = Object.create(null);
const xlCache = Object.create(null);

function meta() {
  if (!metaCache) metaCache = readGz('meta.json.gz');
  return metaCache;
}

function searchRows(kind) {
  if (!searchCache[kind]) {
    const rows = readGz(`search-${kind}.json.gz`);
    for (const x of rows) {
      x.kind = kind;
      x.url = SITE + PATHS[kind] + x.slug;
    }
    searchCache[kind] = rows;
  }
  return searchCache[kind];
}

function fullMap(kind) {
  if (!fullCache[kind]) fullCache[kind] = readGz(`full-${kind}.json.gz`);
  return fullCache[kind];
}

function xlMap(kind) {
  if (xlCache[kind] === undefined) {
    try {
      xlCache[kind] = readGz(`full-${kind}-xl.json.gz`);
    } catch {
      xlCache[kind] = null;
    }
  }
  return xlCache[kind];
}

/** Search rows for the given kinds (default: all). */
function rowsFor(type) {
  const kinds = type && KINDS.includes(type) ? [type] : KINDS;
  return kinds.flatMap(searchRows);
}

/** Hydrate one search hit (or slug) into the full prompt record used by get/random. */
function hydrate(kind, slug) {
  const body = fullMap(kind)[slug];
  if (!body) return;
  const prompt = body.xl ? xlMap(kind)?.[slug]?.prompt || body.prompt : body.prompt;
  return {
    kind,
    slug,
    url: SITE + PATHS[kind] + slug,
    title: body.title,
    desc: body.desc || '',
    prompt,
    model: body.model,
    tags: body.tags,
    media: body.media || [],
    author: body.author || '',
    authorUrl: body.authorUrl || '',
    sourceUrl: body.sourceUrl || '',
    source: body.source,
    likes: body.likes || 0,
  };
}

const norm = (s) => words(s || '').join(' ');

/** The type, model, category and source filters search() and random() share: a test for one item. */
function filter({ type, model, category, source }) {
  const m = norm(model);
  const c = norm(category);
  const src = norm(source);
  return (x) =>
    (!type || x.kind === type) &&
    (!m || norm(x.model).includes(m)) &&
    (!c || x.tags.some((t) => norm(t) === c)) &&
    (!src || norm(x.source) === src);
}

/** Ranked search: title hits weigh most, then category/model, summary and prompt text. */
export function search({ query = '', type, model, category, source, limit = 8 }) {
  const items = rowsFor(type);
  const terms = [...new Set(words(query))];
  const keep = filter({ type, model, category, source });
  const sourceName = (key) => {
    const name = meta().sources?.[key]?.name;
    return name ? ' ' + words(name).join(' ') + ' ' : '';
  };
  const scored = [];
  for (const x of items) {
    if (!keep(x)) continue;
    let score = 0;
    let hits = 0;
    const srcName = sourceName(x.source);
    for (const w of terms) {
      let s = 0;
      for (const a of variants(w)) {
        if (x.idx.title.includes(' ' + a)) s = Math.max(s, 6);
        if (x.idx.tags.includes(' ' + a)) s = Math.max(s, 3);
        if (srcName.includes(' ' + a) || (x.source && words(x.source).includes(a))) s = Math.max(s, 3);
        if (x.idx.desc.includes(a)) s = Math.max(s, 2);
        if (x.idx.prompt.includes(' ' + a)) s = Math.max(s, 1);
      }
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
export function random({ type, model, category, source } = {}, pick = Math.random) {
  const matches = rowsFor(type).filter(filter({ type, model, category, source }));
  if (!matches.length) return;
  const hit = matches[Math.floor(pick() * matches.length)];
  return hydrate(hit.kind, hit.slug);
}

/** Find a prompt by its page URL or slug. */
export function find(ref, type) {
  const s = String(ref).trim().replace(/[?#].*$/, '').replace(/\/+$/, '');
  const m = s.match(/\/(prompt|video|text-prompt)\/([^/]+)$/);
  if (m) {
    const kind = { prompt: 'image', video: 'video', 'text-prompt': 'text' }[m[1]];
    return hydrate(kind, m[2]);
  }
  const slug = s.split('/').pop();
  for (const k of type ? [type] : KINDS) {
    const x = hydrate(k, slug);
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
  const src = meta().sources[x.source];
  return {
    author: x.author || undefined,
    authorUrl: x.authorUrl || undefined,
    original: x.sourceUrl || undefined,
    collection: src ? `${src.name} by ${src.by} (${src.license})` : undefined,
    collectionUrl: x.source ? `${SITE}/source/${x.source}` : undefined,
    license: src?.licenseUrl,
  };
};

/** Short form used in search results. */
export const summary = (x) => {
  const src = x.source ? meta().sources?.[x.source] : null;
  return {
    title: x.title,
    type: x.kind,
    model: x.model,
    tags: x.tags,
    source: x.source,
    ...(src?.name ? { collection: src.name } : {}),
    url: x.url,
    preview: x.preview,
    ...(x.sample ? { sample: x.sample } : {}),
  };
};

/** Counts for the filters, so an agent can pick valid values. */
export function filters() {
  return meta().filters;
}

/** Open-source collections with browse URLs, for list_filters. */
export function sourceIndex() {
  const f = meta().filters;
  const keys = new Set([
    ...Object.keys(f.image?.sources || {}),
    ...Object.keys(f.video?.sources || {}),
    ...Object.keys(f.text?.sources || {}),
  ]);
  return [...keys]
    .map((key) => {
      const s = meta().sources[key];
      const prompts =
        (f.image?.sources?.[key] || 0) + (f.video?.sources?.[key] || 0) + (f.text?.sources?.[key] || 0);
      return {
        key,
        name: s?.name || key,
        by: s?.by,
        license: s?.license,
        prompts,
        url: `${SITE}/source/${key}`,
        repo: s?.url,
      };
    })
    .sort((a, b) => b.prompts - a.prompts);
}
