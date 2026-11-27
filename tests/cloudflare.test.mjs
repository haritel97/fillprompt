// The built site as Cloudflare serves it (npm run test:cloudflare starts wrangler dev and sets SITE_URL):
// the addresses, redirects and headers vercel.json gave it on Vercel. Skipped in a plain `npm test`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const base = process.env.SITE_URL;
const skip = !base && 'needs SITE_URL (npm run test:cloudflare)';
const get = (path, init) => fetch(base + path, { redirect: 'manual', ...init });
const vercel = JSON.parse(await readFile('vercel.json', 'utf8'));

test('pages answer at their clean address, and the slash or /ms forms redirect to it', { skip }, async () => {
  const home = await get('/');
  assert.equal(home.status, 200);
  const html = await home.text();
  const prompt = html.match(/href="(\/prompt\/[a-z0-9-]+)"/)?.[1];
  assert.ok(prompt, 'the home page links a prompt');
  for (const path of [prompt, '/packs', '/mcp', '/sources']) assert.equal((await get(path)).status, 200, path);
  for (const [from, to] of [['/packs/', '/packs'], ['/ms', '/'], ['/ms/packs', '/packs']]) {
    const res = await get(from);
    assert.ok([301, 307, 308].includes(res.status), `${from} answered ${res.status}`);
    assert.equal(new URL(res.headers.get('location'), base).pathname, to, from);
  }
  const missing = await get('/prompt/no-such-prompt-anywhere');
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /<html/);
});

test('every old prompt address in vercel.json still redirects permanently', { skip }, async () => {
  for (const r of vercel.redirects.filter((r) => !r.has && !r.source.includes(':'))) {
    const res = await get(r.source);
    assert.equal(res.status, 301, r.source);
    assert.equal(new URL(res.headers.get('location'), base).pathname, r.destination, r.source);
  }
});

test('the site headers, build files kept a year, search indexes a day, robots.txt as written', { skip }, async () => {
  for (const path of ['/', '/api/mcp']) {
    const res = await get(path, { headers: { accept: 'text/html' } });
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff', path);
    assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN', path);
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin', path);
  }
  const html = await (await get('/')).text();
  const asset = html.match(/(\/_astro\/[^"]+\.(?:css|js))"/)?.[1];
  assert.ok(asset, 'the home page loads an /_astro file');
  assert.equal((await get(asset)).headers.get('cache-control'), 'public, max-age=31536000, immutable');
  assert.match((await get('/search/i.json')).headers.get('cache-control'), /max-age=86400, stale-while-revalidate/);
  assert.equal((await get('/_mcp/meta.json')).headers.get('x-robots-tag'), 'noindex');
  assert.equal(await (await get('/robots.txt')).text(), await readFile('public/robots.txt', 'utf8'));
  assert.equal((await get('/api/nothing-here')).status, 404);
});

test('every page counts visits with Cloudflare Web Analytics', { skip }, async () => {
  const beacon = `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"a2c023ea16904f84917c4522e5ca63d8"}'></script></body>`;
  const home = await (await get('/')).text();
  const prompt = home.match(/href="(\/prompt\/[a-z0-9-]+)"/)?.[1];
  for (const path of ['/', prompt, '/packs', '/mcp', '/prompt/no-such-prompt-anywhere']) {
    const html = await (await get(path)).text();
    assert.equal(html.split(beacon).length, 2, `${path} carries the beacon once`);
  }
});
