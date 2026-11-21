import { images, texts, videos, excerpt } from '../../lib/data';

// Search rows, one file per kind, so a page only downloads the kind it searches.
// /search/i.json  image: [title, slug, cat0, image, excerpt, model, source, ...extraCats]
// /search/v.json  video: [title, slug, model, poster, excerpt, clipOrEmpty, source]
// /search/t.json  text:  [title, slug, model, type, source, excerpt]
const rows = {
  i: () =>
    images.map((p) => [
      p.title,
      p.slug,
      p.cats[0],
      p.images[0],
      excerpt(p.prompt, 110),
      p.model === 'Any image model' ? '' : p.model,
      p.source,
      ...p.cats.slice(1),
    ]),
  v: () =>
    videos.map((v) => [v.title, v.slug, v.model, v.poster, excerpt(v.prompt, 160), v.poster ? '' : v.video, v.source]),
  t: () => texts.map((t) => [t.title, t.slug, t.model, t.type, t.source, excerpt(t.prompt, 120)]),
};

export function getStaticPaths() {
  return Object.keys(rows).map((kind) => ({ params: { kind } }));
}

export function GET({ params }: { params: { kind: keyof typeof rows } }) {
  return new Response(JSON.stringify(rows[params.kind]()), { headers: { 'Content-Type': 'application/json' } });
}
