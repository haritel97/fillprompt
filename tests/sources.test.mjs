// Sources browse + marketing-copy scale checks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(f, 'utf8'));
const images = read('src/data/image-prompts.json');
const videos = read('src/data/video-prompts.json');
const texts = read('src/data/text-prompts.json');
const meta = read('src/data/meta.json');
const total = images.length + videos.length + texts.length;

const used = new Set([...images, ...videos, ...texts].map((x) => x.source));

test('every used source is listed in meta.json', () => {
  for (const key of used) {
    assert.ok(meta.sources[key], `missing meta.sources.${key}`);
  }
});

test('sourceStats keys cover every used prompt source', async () => {
  // Mirror src/lib/data.ts sourceStats logic without importing Astro JSON modules.
  const countBy = (list) =>
    list.reduce((a, x) => ((a[x.source] = (a[x.source] || 0) + 1), a), {});
  const ic = countBy(images);
  const vc = countBy(videos);
  const tc = countBy(texts);
  const keys = Object.keys(meta.sources).filter((k) => (ic[k] || 0) + (vc[k] || 0) + (tc[k] || 0) > 0);
  assert.deepEqual([...keys].sort(), [...used].sort());
});

test('README lists the four newer open-source collections', () => {
  const readme = readFileSync('README.md', 'utf8');
  for (const needle of ['superdesign-prompts', 'zsky-prompt-library', 'samuxbuilds/awesome-prompts', 'hodios-dist']) {
    assert.match(readme, new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

test('distribution copy stays within catalog scale', () => {
  const floor = Math.floor(total / 100) * 100; // e.g. 12800
  const files = {
    'server.json': read('server.json').description,
    'plugins/fillprompt/.claude-plugin/plugin.json': read('plugins/fillprompt/.claude-plugin/plugin.json').description,
    '.claude-plugin/marketplace.json': read('.claude-plugin/marketplace.json').plugins[0].description,
  };
  for (const [file, text] of Object.entries(files)) {
    const m = text.match(/([\d,]+)\+/);
    assert.ok(m, `${file} should include an N+ prompt count`);
    const claimed = Number(m[1].replace(/,/g, ''));
    assert.ok(
      claimed >= floor - 1000 && claimed <= total + 200,
      `${file} claims ${claimed}+ but catalog has ${total}`,
    );
  }

  const readme = readFileSync('README.md', 'utf8');
  for (const [label, n] of [
    ['Image prompts', images.length],
    ['Video prompts', videos.length],
    ['Text prompts', texts.length],
  ]) {
    assert.match(readme, new RegExp(`\\| ${label} \\| ${n.toLocaleString('en-US')} \\|`));
  }
});
