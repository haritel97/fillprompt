// Related-prompt ranking used on detail pages.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relatedImages, relatedVideos, relatedTexts } from '../src/lib/related.ts';

test('relatedImages prefers shared category and model', () => {
  const current = { slug: 'a', title: 'Coffee product shot', model: 'Nano Banana', cats: ['product-brand'], likes: 10 };
  const pool = [
    current,
    { slug: 'b', title: 'Tea can on marble', model: 'Nano Banana', cats: ['product-brand'], likes: 2 },
    { slug: 'c', title: 'Poster for a festival', model: 'GPT Image', cats: ['poster'], likes: 99 },
    { slug: 'd', title: 'Coffee bag flat lay', model: 'Seedream 4.5', cats: ['product-brand'], likes: 50 },
  ];
  const got = relatedImages(current, pool, 2).map((x) => x.slug);
  // Same category: b (same model) ranks above d (higher likes but different model? wait likes 50 vs model boost)
  // score b: 5 + 3 + log10(3)/2 ≈ 8.2
  // score d: 5 + 0 + log10(51)/2 ≈ 5.85
  assert.deepEqual(got, ['b', 'd']);
  assert.ok(!got.includes('c'));
});

test('relatedVideos falls back to same model', () => {
  const current = { slug: 'a', title: 'City night drive', model: 'Seedance', cats: [], likes: 1 };
  const pool = [
    current,
    { slug: 'b', title: 'Ocean waves', model: 'Seedance', cats: ['nature'], likes: 0 },
    { slug: 'c', title: 'Unrelated', model: 'Grok Imagine', cats: ['other'], likes: 50 },
  ];
  const got = relatedVideos(current, pool, 1);
  assert.equal(got[0].slug, 'b');
});

test('relatedTexts prefers same type then model', () => {
  const current = { slug: 'a', title: 'API designer agent', model: 'Claude', type: 'agent', forDevs: true };
  const pool = [
    current,
    { slug: 'b', title: 'Code review agent', model: 'Claude', type: 'agent', forDevs: true },
    { slug: 'c', title: 'Friendly chat', model: 'Claude', type: 'text', forDevs: false },
    { slug: 'd', title: 'Deploy agent', model: 'ChatGPT', type: 'agent', forDevs: true },
  ];
  const got = relatedTexts(current, pool, 2).map((x) => x.slug);
  assert.equal(got[0], 'b');
  assert.ok(got.includes('d') || got.includes('c'));
});
