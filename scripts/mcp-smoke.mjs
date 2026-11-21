// Live smoke test for the production MCP endpoint.
//   node scripts/mcp-smoke.mjs
//   node scripts/mcp-smoke.mjs https://fillprompt.com/api/mcp
const url = process.argv[2] || 'https://fillprompt.com/api/mcp';
const VERSION = '2025-06-18';

async function rpc(method, params, id = 1) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'mcp-protocol-version': VERSION,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}`);
  const text = await res.text();
  const body = text.trimStart().startsWith('{') ? text : text.match(/^data: (.*)$/m)?.[1];
  if (!body) throw new Error(`${method}: empty body`);
  const msg = JSON.parse(body);
  if (msg.error) throw new Error(`${method}: ${JSON.stringify(msg.error)}`);
  return msg.result;
}

const parseTool = (result) => {
  if (result?.isError) throw new Error(`tool error: ${JSON.stringify(result)}`);
  return result?.structuredContent || JSON.parse(result?.content?.[0]?.text || '{}');
};

const t0 = Date.now();
let id = 1;
await rpc('initialize', { protocolVersion: VERSION, capabilities: {}, clientInfo: { name: 'smoke', version: '1' } }, id++);
const { tools } = await rpc('tools/list', {}, id++);
const names = tools.map((t) => t.name).sort();
const expected = ['get_prompt', 'list_filters', 'random_prompt', 'search_prompts'];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error(`unexpected tools: ${names.join(', ')}`);
}

const filters = parseTool(await rpc('tools/call', { name: 'list_filters', arguments: {} }, id++));
if (!filters?.image?.total) throw new Error('list_filters returned no image total');

const search = parseTool(
  await rpc('tools/call', { name: 'search_prompts', arguments: { query: 'product photo', type: 'image', limit: 3 } }, id++),
);
if (!search?.results?.length) throw new Error('search_prompts returned no results');
const hit = search.results[0];
if (!hit.url || !hit.title) throw new Error('search hit missing url/title');
if (hit.source && !hit.collectionUrl) throw new Error('search hit missing collectionUrl');

const full = parseTool(await rpc('tools/call', { name: 'get_prompt', arguments: { ref: hit.url } }, id++));
if (!full?.prompt || full.prompt.length < 20) throw new Error('get_prompt returned a short/empty body');
if (!full.credit?.collectionUrl) throw new Error('get_prompt credit missing collectionUrl');

const random = parseTool(await rpc('tools/call', { name: 'random_prompt', arguments: { type: 'text' } }, id++));
if (!random?.prompt) throw new Error('random_prompt returned no prompt');

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      ms: Date.now() - t0,
      imagePrompts: filters.image.total,
      searchHits: search.total,
      sample: hit.url,
      tools: names,
    },
    null,
    2,
  ),
);
