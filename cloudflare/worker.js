// fillprompt.com on Cloudflare Workers. The site is static assets (dist/); this Worker runs only for
// /api/* (see wrangler.jsonc) and serves the MCP server from api/mcp.js, reading the catalog that
// cloudflare/build.mjs put in dist/_mcp.
import { useStore } from '../api/_catalog.js';
import { shard } from './shard.js';

// The headers vercel.json gave every response, the function's included
const SITE_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};
const KEEP_SHARDS = 24;

function assetStore(assets, meta) {
  const read = async (file) => {
    const res = await assets.fetch(new Request(`https://assets.local/_mcp/${file}`));
    if (!res.ok) throw new Error(`Catalog file ${file}: ${res.status}`);
    return res.json();
  };
  const shards = new Map();
  return {
    meta: () => meta,
    search: (kind) => read(`search-${kind}.json`),
    full: async (kind, slug) => {
      const key = `full-${kind}/${shard(slug)}.json`;
      let entry = shards.get(key);
      if (entry) shards.delete(key);
      else entry = read(key);
      shards.set(key, entry); // most recently used last
      if (shards.size > KEEP_SHARDS) shards.delete(shards.keys().next().value);
      try {
        return (await entry)[slug];
      } catch (error) {
        shards.delete(key);
        throw error;
      }
    },
  };
}

let server;
async function mcp(env) {
  server ??= (async () => {
    const meta = await (await env.ASSETS.fetch(new Request('https://assets.local/_mcp/meta.json'))).json();
    useStore(assetStore(env.ASSETS, meta));
    // api/mcp.js reads the filters when it loads, so it loads after the store is in place.
    return import('../api/mcp.js');
  })().catch((error) => {
    server = undefined;
    throw error;
  });
  return server;
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    let res;
    if (pathname === '/api/mcp') {
      const handlers = await mcp(env);
      const handler = handlers[request.method];
      res = handler
        ? await handler(request)
        : new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, POST, DELETE, OPTIONS' } });
    } else if (pathname.startsWith('/api/')) {
      res = new Response('Not found', { status: 404 });
    } else {
      return env.ASSETS.fetch(request);
    }
    const headers = new Headers(res.headers);
    for (const [k, v] of Object.entries(SITE_HEADERS)) headers.set(k, v);
    return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
  },
};
