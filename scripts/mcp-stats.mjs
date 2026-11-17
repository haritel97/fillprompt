// Shows how much the MCP server is used.
//   npm run stats:mcp              last 30 days (human report)
//   npm run stats:mcp -- 7         last 7 days
//   npm run stats:mcp -- --check   health check (exit 1 on bad empty-search rate)
//   npm run stats:mcp -- --json 7  machine-readable summary
const args = process.argv.slice(2);
const check = args.includes('--check');
const asJson = args.includes('--json');
const days = Number(args.find((a) => /^\d+$/.test(a))) || (check ? 7 : 30);

const KEY = 'sb_publishable_Cj7wD5R2tYT2reySsZ3ubQ_A9eCyWO6';
const res = await fetch('https://bckenxyvaavzysmdnepy.supabase.co/rest/v1/rpc/mt_mcp_stats', {
  method: 'POST',
  headers: { 'content-type': 'application/json', apikey: KEY, authorization: `Bearer ${KEY}` },
  body: JSON.stringify({ days }),
});
if (!res.ok) {
  console.error(`Could not read stats (${res.status}): ${await res.text()}`);
  console.error('Has supabase/mcp-usage.sql been run in the Supabase SQL editor?');
  process.exit(1);
}
const rows = await res.json();
const sum = (list, f) => list.reduce((n, r) => n + r[f], 0);

const byTool = {};
for (const r of rows) (byTool[r.tool] ||= []).push(r);

const searches = byTool.search_prompts || [];
const searchCalls = sum(searches, 'calls');
const searchEmpty = sum(searches, 'empty');
const emptyRate = searchCalls ? searchEmpty / searchCalls : 0;

const byKind = {};
for (const r of searches) byKind[r.kind || 'any'] = (byKind[r.kind || 'any'] || 0) + r.calls;

const byDay = {};
for (const r of rows) byDay[r.day] = (byDay[r.day] || 0) + r.calls;
const daysSorted = Object.keys(byDay).sort();

const tools = Object.fromEntries(
  Object.entries(byTool).map(([tool, list]) => [
    tool,
    { calls: sum(list, 'calls'), empty: tool === 'search_prompts' ? sum(list, 'empty') : 0 },
  ]),
);

const summary = {
  days,
  totalCalls: sum(rows, 'calls'),
  tools,
  searchesByType: byKind,
  emptySearchRate: +emptyRate.toFixed(4),
  byDay,
};

// --check: flag a high share of empty searches once there is enough traffic to trust the rate.
const MIN_SEARCHES = 20;
const EMPTY_LIMIT = 0.45;
const healthy = !(searchCalls >= MIN_SEARCHES && emptyRate > EMPTY_LIMIT);

if (asJson) {
  console.log(JSON.stringify({ ...summary, healthy, emptyLimit: EMPTY_LIMIT }, null, 2));
} else {
  console.log(`fillprompt MCP usage, last ${days} days\n`);
  if (!rows.length) {
    console.log('No calls yet.');
  } else {
    console.log('Tool             Calls   Empty searches');
    for (const [tool, list] of Object.entries(byTool)) {
      const empty = tool === 'search_prompts' ? String(sum(list, 'empty')) : '';
      console.log(`${tool.padEnd(16)} ${String(sum(list, 'calls')).padStart(5)}   ${empty}`);
    }
    console.log('\nSearches by type: ' + (Object.keys(byKind).length ? Object.entries(byKind).map(([k, n]) => `${k} ${n}`).join(', ') : 'none'));
    if (searchCalls) {
      console.log(`Empty search rate: ${(emptyRate * 100).toFixed(1)}% (${searchEmpty}/${searchCalls})`);
    }
    console.log('\nDay          Calls');
    for (const day of daysSorted) {
      const n = byDay[day];
      console.log(`${day}   ${String(n).padStart(5)}  ${'#'.repeat(Math.min(n, 60))}`);
    }
  }
  if (check) {
    console.log('');
    if (!healthy) {
      console.error(
        `CHECK FAILED: empty search rate ${(emptyRate * 100).toFixed(1)}% exceeds ${(EMPTY_LIMIT * 100).toFixed(0)}% over ${searchCalls} searches.`,
      );
    } else if (searchCalls >= MIN_SEARCHES) {
      console.log(`CHECK OK: empty search rate ${(emptyRate * 100).toFixed(1)}% (limit ${(EMPTY_LIMIT * 100).toFixed(0)}%).`);
    } else {
      console.log(`CHECK OK: only ${searchCalls} searches in the window (need ${MIN_SEARCHES} before the empty-rate rule applies).`);
    }
  }
}

if (check && !healthy) process.exit(1);
