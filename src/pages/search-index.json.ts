import { images, texts, videos, excerpt } from '../lib/data';

// Compact search index consumed by the search page in both languages.
// Image rows: [title, slug, category slug, image url, prompt excerpt]
export function GET() {
  const body = {
    i: images.map((p) => [p.title, p.slug, p.cats[0], p.images[0], excerpt(p.prompt, 160)]),
    // Text rows: [title, slug, model]
    t: texts.map((t) => [t.title, t.slug, t.model]),
    // Video rows: [title, slug, model, poster url, prompt excerpt, clip url when there is no poster]
    v: videos.map((v) => [v.title, v.slug, v.model, v.poster, excerpt(v.prompt, 160), v.poster ? '' : v.video]),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });
}
