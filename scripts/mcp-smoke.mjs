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

const t0 = Date.now();
await rpc('initialize', { protocolVersion: VERSION, capabilities: {}, clientInfo: { name: 'smoke', version: '1' } });
const { tools } = await rpc('tools/list', {}, 2);
const names = tools.map((t) => t.name).sort();
const expected = ['get_prompt', 'list_filters', 'random_prompt', 'search_prompts'];
if (JSON.stringify(names) !== JSON.stringify(expected)) {
  throw new Error(`unexpected tools: ${names.join(', ')}`);
}
const call = await rpc('tools/call', { name: 'list_filters', arguments: {} }, 3);
if (!call?.structuredContent?.image?.total) throw new Error('list_filters returned no image total');

console.log(
  JSON.stringify(
    {
      ok: true,
      url,
      ms: Date.now() - t0,
      imagePrompts: call.structuredContent.image.total,
      tools: names,
    },
    null,
    2,
  ),
);
