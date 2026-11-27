// npm run test:cloudflare: serves dist/ (after npm run cf:build) with wrangler dev, the runtime Cloudflare
// uses, then runs the MCP tests and the site tests against it. Usage counting is off, so nothing is sent.
import { spawn } from 'node:child_process';
import path from 'node:path';

const port = 8791;
const base = `http://127.0.0.1:${port}`;
const wrangler = spawn(
  process.execPath,
  [path.resolve('node_modules/wrangler/bin/wrangler.js'), 'dev', '--port', String(port), '--ip', '127.0.0.1', '--var', 'MCP_USAGE:off', '--log-level', 'error'],
  { stdio: ['ignore', 'inherit', 'inherit'] },
);
try {
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(base + '/robots.txt')).ok) break;
    } catch {
      // still starting
    }
    if (i > 120) throw new Error('wrangler dev did not start');
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  const tests = spawn(process.execPath, ['--test', 'tests/mcp.test.mjs', 'tests/cloudflare.test.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, MCP_URL: base + '/api/mcp', SITE_URL: base },
  });
  const [code] = await new Promise((resolve) => tests.on('exit', (...args) => resolve(args)));
  process.exitCode = code ?? 1;
} finally {
  wrangler.kill();
}
