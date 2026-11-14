// URL lists for the sitemaps. Split by kind so Search Console reports indexing for each one.
import { images, texts, videos, catSlugs, catCounts, imageModels, videoModels, textModels, TEXT_FILTERS, textFilterCounts } from './data';
import { IMAGE_PAGE, TEXT_PAGE, VIDEO_PAGE } from './paths';
import { url } from './seo';

const paged = (base: string, total: number, size: number) =>
  Array.from({ length: Math.max(1, Math.ceil(total / size)) }, (_, i) => (i ? `${base}/${i + 1}` : base));

/** [path, lastmod or ''] pairs. Only real dates are given; a build date on every URL would be noise. */
type Entry = [string, string];
/** A source's own date (YYYY-MM-DD...), or '' when it has none. */
const day = (d?: string) => (/^\d{4}-\d{2}-\d{2}/.test(d || '') ? d!.slice(0, 10) : '');

export const SITEMAPS: Record<string, () => Entry[]> = {
  // Home, list and category pages, and the fixed pages. The search page is left out on purpose.
  pages: () =>
    [
      '/',
      ...paged('/images', images.length, IMAGE_PAGE),
      ...catSlugs.flatMap((c) => paged(`/category/${c}`, catCounts[c], IMAGE_PAGE)),
      ...imageModels.flatMap((m) => paged(`/image-model/${m.slug}`, m.count, IMAGE_PAGE)),
      ...paged('/videos', videos.length, VIDEO_PAGE),
      ...videoModels.flatMap((m) => paged(`/video-model/${m.slug}`, m.count, VIDEO_PAGE)),
      ...paged('/text', texts.length, TEXT_PAGE),
      ...textModels.flatMap((m) => paged(`/text-model/${m.slug}`, m.count, TEXT_PAGE)),
      ...TEXT_FILTERS.filter((f) => textFilterCounts[f]).flatMap((f) => paged(`/text-type/${f}`, textFilterCounts[f], TEXT_PAGE)),
      '/skills',
      '/mcp',
      '/credits',
      '/donate',
    ].map((p) => [p, '']),
  'image-prompts': () => images.map((p) => [`/prompt/${p.slug}`, day(p.date)]),
  'video-prompts': () => videos.map((v) => [`/video/${v.slug}`, day(v.date)]),
  'text-prompts': () => texts.map((t) => [`/text-prompt/${t.slug}`, '']),
};

export const urlset = (entries: Entry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(([p, d]) => `<url><loc>${url('en', p)}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</url>`)
    .join('\n')}\n</urlset>\n`;
