import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PACK_DEFS, buildPacks } from '../src/lib/pack-build.mjs';
import { promptOfTheDay, utcDay } from '../src/lib/daily-build.mjs';

const images = JSON.parse(readFileSync('src/data/image-prompts.json', 'utf8'));
const videos = JSON.parse(readFileSync('src/data/video-prompts.json', 'utf8'));
const texts = JSON.parse(readFileSync('src/data/text-prompts.json', 'utf8'));
const packs = buildPacks({ images, videos, texts, defs: PACK_DEFS });

test('every pack has a slug, title and enough items', () => {
  assert.ok(packs.length >= 6);
  for (const p of packs) {
    assert.match(p.slug, /^[a-z0-9-]+$/);
    assert.ok(p.title.length > 3);
    assert.ok(p.items.length >= 8, `${p.slug} too small`);
  }
});

test('pack items have unique kind:slug keys', () => {
  for (const p of packs) {
    const keys = p.items.map((i) => `${i.kind}:${i.slug}`);
    assert.equal(new Set(keys).size, keys.length, p.slug);
  }
});

test('prompt of the day is stable for a given UTC day', () => {
  const d = new Date('2026-11-19T08:00:00Z');
  const a = promptOfTheDay(images, d);
  const b = promptOfTheDay(images, new Date('2026-11-19T23:00:00Z'));
  assert.equal(a.slug, b.slug);
  assert.ok(a.images[0]);
  assert.notEqual(promptOfTheDay(images, new Date((utcDay(d) + 1) * 86_400_000)).slug, a.slug);
});
