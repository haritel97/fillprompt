import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALIAS, variants, wordHit } from '../src/lib/synonyms.mjs';

test('variants include the word itself and aliases', () => {
  assert.deepEqual(variants('thumb'), ['thumb', 'thumbnail', 'youtube']);
  assert.ok(ALIAS.portrait.includes('headshot'));
});

test('wordHit matches aliases in a haystack', () => {
  assert.equal(wordHit('youtube thumbnail layout', 'thumb'), true);
  assert.equal(wordHit('studio rembrandt lighting', 'portrait'), false);
  assert.equal(wordHit('executive headshot soft light', 'portrait'), true);
});
