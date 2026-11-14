import { images, texts, videos, excerpt } from '../../lib/data';

// Search rows, one file per kind, so a page only downloads the kind it searches.
// /search/i.json  image rows: [title, slug, category slug, image url, prompt excerpt, model ('' for any model), second category?]
// /search/v.json  video rows: [title, slug, model, poster url, prompt excerpt, clip url when there is no poster]
// /search/t.json  text rows:  [title, slug, model]
const rows = {
  i: () =>
    images.map((p) => [
      p.title,
      p.slug,
      p.cats[0],
      p.images[0],
      excerpt(p.prompt, 110),
      p.model === 'Any image model' ? '' : p.model,
      ...p.cats.slice(1),
    ]),
  v: () => videos.map((v) => [v.title, v.slug, v.model, v.poster, excerpt(v.prompt, 160), v.poster ? '' : v.video]),
  t: () => texts.map((t) => [t.title, t.slug, t.model]),
};

export function getStaticPaths() {
  return Object.keys(rows).map((kind) => ({ params: { kind } }));
}

export function GET({ params }: { params: { kind: keyof typeof rows } }) {
  return new Response(JSON.stringify(rows[params.kind]()), { headers: { 'Content-Type': 'application/json' } });
}
