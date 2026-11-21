// Pure JS pack builder — used by Astro (via packs.ts) and by Node tests.
export const PACK_DEFS = [
  {
    slug: 'ecommerce',
    title: 'E-commerce product shots',
    tag: 'E-commerce',
    blurb: 'Packaging, hero shots and marketplace detail images ready to fill with your product.',
    kinds: ['image'],
    cats: ['product-brand'],
    keywords: ['product', 'packaging', 'bottle', 'ecommerce', 'amazon', 'shopify', 'sku'],
    limit: 48,
  },
  {
    slug: 'youtube-thumbnails',
    title: 'YouTube thumbnails',
    tag: 'YouTube',
    blurb: 'Bold thumbnail layouts for unboxing, reviews and channel intros.',
    kinds: ['image'],
    cats: ['social-media'],
    keywords: ['youtube', 'thumbnail', 'thumb'],
    limit: 48,
  },
  {
    slug: 'posters-ads',
    title: 'Posters and ads',
    tag: 'Posters',
    blurb: 'Event posters, promo flyers and ad creatives with sample results.',
    kinds: ['image'],
    cats: ['poster'],
    keywords: ['poster', 'flyer', 'advert', 'campaign'],
    limit: 48,
  },
  {
    slug: 'food-drink',
    title: 'Food and drink',
    tag: 'Food',
    blurb: 'Menu boards, plated dishes and beverage product photography.',
    kinds: ['image'],
    cats: ['food-drink'],
    keywords: ['food', 'menu', 'coffee', 'drink', 'restaurant'],
    limit: 48,
  },
  {
    slug: 'ui-infographics',
    title: 'UI and infographics',
    tag: 'UI',
    blurb: 'App screens, dashboards and educational visual explainers.',
    kinds: ['image'],
    cats: ['infographic-ui'],
    keywords: ['ui', 'ux', 'dashboard', 'infographic', 'wireframe'],
    limit: 48,
  },
  {
    slug: 'cinematic-video',
    title: 'Cinematic video',
    tag: 'Cinema',
    blurb: 'Drone, night city and film-style clips for Seedance and other video models.',
    kinds: ['video'],
    keywords: ['cinematic', 'drone', 'night', 'film', 'tracking'],
    limit: 36,
  },
  {
    slug: 'agent-roles',
    title: 'Agent and system prompts',
    tag: 'Agents',
    blurb: 'Ready-made roles for coding agents, API designers and review bots.',
    kinds: ['text'],
    textTypes: ['agent', 'developer'],
    keywords: ['agent', 'system prompt', 'you are a'],
    limit: 48,
  },
  {
    slug: 'seedance',
    title: 'Seedance starters',
    tag: 'Seedance',
    blurb: 'Video prompts written for Seedance, each with a sample clip where available.',
    kinds: ['video'],
    model: 'seedance',
    limit: 36,
  },
  {
    slug: 'portraits',
    title: 'Portraits and avatars',
    tag: 'Portraits',
    blurb: 'Headshots, character sheets and avatar-ready looks with sample images.',
    kinds: ['image'],
    cats: ['portrait-avatar'],
    keywords: ['portrait', 'avatar', 'selfie', 'headshot'],
    limit: 48,
  },
  {
    slug: 'comic-anime',
    title: 'Comics and anime',
    tag: 'Anime',
    blurb: 'Storyboard panels, comic covers and anime-style illustrations.',
    kinds: ['image'],
    cats: ['comic-anime'],
    keywords: ['anime', 'manga', 'comic', 'storyboard'],
    limit: 48,
  },
  {
    slug: 'logos-brand',
    title: 'Logos and brand marks',
    tag: 'Logos',
    blurb: 'Wordmarks, emblems and brand identity starters for product and studio work.',
    kinds: ['image'],
    cats: ['product-brand'],
    keywords: ['logo', 'wordmark', 'emblem', 'brand mark', 'monogram'],
    limit: 36,
  },
  {
    slug: 'developer-prompts',
    title: 'Developer text prompts',
    tag: 'Dev',
    blurb: 'System prompts and roles aimed at engineers: APIs, reviews, architecture.',
    kinds: ['text'],
    textTypes: ['developer', 'agent'],
    keywords: ['code', 'api', 'typescript', 'debug', 'architect'],
    limit: 48,
  },
  {
    slug: 'ui-components',
    title: 'UI component design specs',
    tag: 'UI Design',
    blurb: 'Structured design-integration prompts for interactive backgrounds, layouts and React UI.',
    kinds: ['text'],
    textTypes: ['structured'],
    sources: ['superdesign'],
    keywords: ['react', 'component', 'background', 'animation', 'tailwind'],
    limit: 48,
  },
  {
    slug: 'photo-lighting',
    title: 'Photography and lighting recipes',
    tag: 'Photo',
    blurb: 'Portrait, studio and cinematic lighting prompts ready for any image model.',
    kinds: ['text', 'image'],
    textTypes: ['image'],
    cats: ['photography', 'portrait-avatar'],
    sources: ['zsky', 'samux'],
    keywords: ['lighting', 'portrait', 'studio', 'rembrandt', 'cinematic'],
    limit: 48,
  },
  {
    slug: 'miniatures-3d',
    title: '3D miniatures and dioramas',
    tag: '3D',
    blurb: 'Figurines, isometric scenes and collectible-style 3D renders with sample images.',
    kinds: ['image'],
    cats: ['illustration-3d'],
    sources: ['samux'],
    keywords: ['miniature', 'figurine', 'diorama', 'isometric', '3d'],
    limit: 48,
  },
  {
    slug: 'writing-workflows',
    title: 'Writing and editing workflows',
    tag: 'Writing',
    blurb: 'Paste-ready workflows for drafts, edits, academic integrity and clear communication.',
    kinds: ['text'],
    textTypes: ['structured', 'text'],
    sources: ['hodios'],
    keywords: ['writing', 'edit', 'draft', 'email', 'academic', 'tone'],
    limit: 48,
  },
];

const hay = (title, desc, prompt) => `${title} ${desc || ''} ${(prompt || '').slice(0, 400)}`.toLowerCase();

const scoreImage = (p, def) => {
  let s = 0;
  if (def.sources?.includes(p.source)) s += 8;
  if (def.cats?.some((c) => p.cats.includes(c))) s += 6;
  if (def.model && p.model.toLowerCase().includes(def.model.toLowerCase())) s += 4;
  const h = hay(p.title, p.desc, p.prompt);
  for (const k of def.keywords || []) if (h.includes(k.toLowerCase())) s += 2;
  if (!s) return 0;
  return s + Math.log10(1 + (p.likes || 0)) / 2;
};

const scoreVideo = (v, def) => {
  let s = 0;
  if (def.cats?.some((c) => (v.cats || []).includes(c))) s += 6;
  if (def.model && v.model.toLowerCase().includes(def.model.toLowerCase())) s += 5;
  const h = hay(v.title, v.desc, v.prompt);
  for (const k of def.keywords || []) if (h.includes(k.toLowerCase())) s += 2;
  if (!s) return 0;
  return s + Math.log10(1 + (v.likes || 0)) / 2;
};

const scoreText = (t, def) => {
  let s = 0;
  if (def.sources?.includes(t.source)) s += 8;
  if (def.textTypes?.includes(t.type)) s += 6;
  if (def.textTypes?.includes('developer') && t.forDevs) s += 4;
  if (def.model && t.model.toLowerCase().includes(def.model.toLowerCase())) s += 3;
  const h = hay(t.title, t.desc, t.prompt);
  for (const k of def.keywords || []) if (h.includes(k.toLowerCase())) s += 2;
  if (!s) return 0;
  return s;
};

function buildItems(def, { images, videos, texts }) {
  const limit = def.limit ?? 40;
  const scored = [];

  if (def.kinds.includes('image')) {
    for (const p of images) {
      const score = scoreImage(p, def);
      if (!score) continue;
      scored.push({
        score,
        item: {
          kind: 'image',
          slug: p.slug,
          title: p.title,
          href: `/prompt/${p.slug}`,
          preview: p.desc || p.title,
          sample: p.images[0],
          model: p.model,
          likes: p.likes || 0,
        },
      });
    }
  }
  if (def.kinds.includes('video')) {
    for (const v of videos) {
      const score = scoreVideo(v, def);
      if (!score) continue;
      scored.push({
        score,
        item: {
          kind: 'video',
          slug: v.slug,
          title: v.title,
          href: `/video/${v.slug}`,
          preview: v.desc || v.title,
          sample: v.poster || undefined,
          model: v.model,
          likes: v.likes || 0,
        },
      });
    }
  }
  if (def.kinds.includes('text')) {
    for (const t of texts) {
      const score = scoreText(t, def);
      if (!score) continue;
      scored.push({
        score,
        item: {
          kind: 'text',
          slug: t.slug,
          title: t.title,
          href: `/text-prompt/${t.slug}`,
          preview: t.desc || t.prompt.slice(0, 160),
          model: t.model,
          likes: 0,
        },
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const { item } of scored) {
    const key = `${item.kind}:${item.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= limit) break;
  }
  return out;
}

export function buildPacks({ images, videos, texts, defs = PACK_DEFS }) {
  return defs.map((def) => ({ ...def, items: buildItems(def, { images, videos, texts }) })).filter((p) => p.items.length >= 8);
}

/** Reverse index: kind → slug → [{ slug, title, tag }]. */
export function packMembership(packs) {
  const map = { image: Object.create(null), video: Object.create(null), text: Object.create(null) };
  for (const p of packs) {
    const ref = { slug: p.slug, title: p.title, tag: p.tag };
    for (const item of p.items) {
      const bucket = map[item.kind];
      if (!bucket) continue;
      (bucket[item.slug] ||= []).push(ref);
    }
  }
  return map;
}
