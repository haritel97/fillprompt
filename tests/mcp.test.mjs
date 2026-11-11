// Tests for the MCP server in api/mcp.js: speaks the protocol and the four tools return sound data.
// Run with `npm test`. Usage recording is switched off so the tests send nothing anywhere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

process.env.MCP_USAGE = 'off';
const { POST, GET, OPTIONS } = await import(pathToFileURL(path.resolve('api/mcp.js')).href);

const VERSION = '2025-06-18';
let id = 0;
async function rpc(method, params, headers = { 'mcp-protocol-version': VERSION }) {
  const res = await POST(
    new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...headers },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++id, method, params }),
    }),
  );
  assert.equal(res.status, 200, `${method} answered ${res.status}`);
  const text = await res.text();
  // Replies come as JSON or as a single server-sent event.
  const body = text.trimStart().startsWith('{') ? text : text.match(/^data: (.*)$/m)?.[1];
  const msg = JSON.parse(body);
  assert.ok(!msg.error, `${method} failed: ${JSON.stringify(msg.error)}`);
  return msg.result;
}
const call = async (name, args) => {
  const r = await rpc('tools/call', { name, arguments: args });
  return r;
};

test('initialize names the server', async () => {
  const r = await rpc('initialize', { protocolVersion: VERSION, capabilities: {}, clientInfo: { name: 'test', version: '1' } }, {});
  assert.equal(r.serverInfo.name, 'fillprompt');
  assert.ok(r.capabilities.tools);
});

test('tools/list has the four read-only tools', async () => {
  const { tools } = await rpc('tools/list');
  assert.deepEqual(tools.map((t) => t.name).sort(), ['get_prompt', 'list_filters', 'random_prompt', 'search_prompts']);
  for (const t of tools) assert.equal(t.annotations?.readOnlyHint, true, `${t.name} is read-only`);
});

test('search_prompts finds image prompts on topic', async () => {
  const r = await call('search_prompts', { query: 'coffee product photo', type: 'image', limit: 5 });
  const { total, results } = r.structuredContent;
  assert.ok(total > 0);
  assert.ok(results.length > 0 && results.length <= 5);
  for (const x of results) {
    assert.equal(x.type, 'image');
    assert.match(x.url, /^https:\/\/fillprompt\.com\/prompt\/[a-z0-9-]+$/);
  }
  assert.match(JSON.stringify(results[0]).toLowerCase(), /coffee/);
});

test('search_prompts honours model and category filters', async () => {
  const video = (await call('search_prompts', { query: 'city at night', model: 'seedance', limit: 3 })).structuredContent;
  assert.ok(video.results.length > 0);
  for (const x of video.results) assert.match(x.model, /seedance/i);

  const agents = (await call('search_prompts', { query: 'code review', type: 'text', category: 'agent', limit: 3 })).structuredContent;
  assert.ok(agents.results.length > 0);
  for (const x of agents.results) assert.ok(x.tags.includes('agent'));
});

test('get_prompt returns the full prompt, slots and credit', async () => {
  const first = (await call('search_prompts', { query: 'stickers', type: 'image', limit: 1 })).structuredContent.results[0];
  const p = (await call('get_prompt', { ref: first.url })).structuredContent;
  assert.equal(p.url, first.url);
  assert.ok(p.prompt.length > 20);
  assert.ok(Array.isArray(p.slots));
  assert.ok(p.credit.collection || p.credit.author, 'has a credit');

  const bySlug = (await call('get_prompt', { ref: first.url.split('/').pop() })).structuredContent;
  assert.equal(bySlug.url, first.url);
});

test('get_prompt reads template slots with their defaults', async () => {
  const { results } = (await call('search_prompts', { query: 'LINE stickers animals', type: 'image', limit: 10 })).structuredContent;
  let found;
  for (const r of results) {
    const p = (await call('get_prompt', { ref: r.url })).structuredContent;
    if (p.prompt.includes('{argument name=')) found = p;
  }
  assert.ok(found, 'a prompt with {argument} slots is in the results');
  assert.ok(found.slots.some((s) => s.example), 'slots carry their default as an example');
});

test('get_prompt reports an unknown prompt as a tool error', async () => {
  const r = await call('get_prompt', { ref: 'https://fillprompt.com/prompt/does-not-exist' });
  assert.equal(r.isError, true);
});

test('random_prompt with type video returns a full video prompt', async () => {
  const p = (await call('random_prompt', { type: 'video' })).structuredContent;
  assert.equal(p.type, 'video');
  assert.match(p.url, /^https:\/\/fillprompt\.com\/video\/[a-z0-9-]+$/);
  assert.ok(p.prompt.length > 20);
  assert.ok(Array.isArray(p.slots));
  assert.ok(p.credit, 'has a credit');
  assert.deepEqual((await call('get_prompt', { ref: p.url })).structuredContent, p, 'same shape as get_prompt');
});

test('random_prompt honours the model and category filters', async () => {
  for (let i = 0; i < 5; i++) {
    const v = (await call('random_prompt', { model: 'seedance' })).structuredContent;
    assert.match(v.model, /seedance/i);
    const a = (await call('random_prompt', { type: 'text', category: 'agent' })).structuredContent;
    assert.ok(a.tags.includes('agent'));
  }
});

test('random_prompt reports filters nothing matches as a tool error', async () => {
  const r = await call('random_prompt', { model: 'no-such-model-anywhere' });
  assert.equal(r.isError, true);
});

test('list_filters counts every kind', async () => {
  const f = (await call('list_filters', {})).structuredContent;
  for (const k of ['image', 'video', 'text']) assert.ok(f[k].total > 0, `${k} has prompts`);
  assert.ok(Object.keys(f.image.categories).length > 0);
});

test('a browser opening the URL is sent to the setup page', async () => {
  const res = await GET(new Request('http://localhost/api/mcp', { headers: { accept: 'text/html' } }));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), 'https://fillprompt.com/mcp');
});

test('CORS preflight is allowed', async () => {
  const res = await OPTIONS();
  assert.equal(res.status, 204);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});
