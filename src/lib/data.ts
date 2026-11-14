import imageData from '../data/image-prompts.json';
import textData from '../data/text-prompts.json';
import videoData from '../data/video-prompts.json';
import skillData from '../data/skills.json';
import communityData from '../data/community-skills.json';
import meta from '../data/meta.json';

export interface ImagePrompt {
  slug: string;
  title: string;
  desc: string;
  prompt: string;
  images: string[];
  cats: string[];
  model: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  date: string;
  likes: number;
  source: string;
}
export interface VideoPrompt {
  slug: string;
  title: string;
  desc: string;
  prompt: string;
  poster: string;
  /** Direct link to the sample clip on the original collection's server; empty when only a poster exists. */
  video: string;
  model: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  date: string;
  likes: number;
  source: string;
}
export interface TextPrompt {
  slug: string;
  title: string;
  prompt: string;
  type: string; // 'text' | 'structured' | 'image' | 'agent'
  forDevs: boolean;
  /** One-line summary, when the source gives one. */
  desc: string;
  /** The AI the prompt was written for: 'ChatGPT' | 'Claude' | 'Gemini' | 'Any model'. */
  model: string;
  /** Key into `sources`. */
  source: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
}
export interface Skill {
  name: string;
  description: string;
  license: string; // 'apache' | 'proprietary' | 'none'
  url: string;
}
export interface CommunitySkill {
  name: string;
  by: string;
  description: string;
  license: string; // SPDX id, e.g. 'MIT'
  stars: number;
  topic: string; // 'motion' | 'design' | 'more'
  url: string;
}
export interface Source {
  name: string;
  by: string;
  url: string;
  license: string;
  licenseUrl: string;
}

export const images = imageData as ImagePrompt[];
export const texts = textData as TextPrompt[];
export const videos = videoData as VideoPrompt[];
export const skills = skillData as Skill[];
export const communitySkills = communityData as CommunitySkill[];
export const sources = meta.sources as Record<string, Source>;

export const catCounts: Record<string, number> = {};
for (const p of images) for (const c of p.cats) catCounts[c] = (catCounts[c] || 0) + 1;
/** Category slugs that have at least one prompt, in display order. */
export const catSlugs = (meta.categories as string[]).filter((c) => catCounts[c]);

const slugOf = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** AI models that have video prompts, most prompts first: used for the model filter. */
export const videoModels = Object.entries(
  videos.reduce<Record<string, number>>((a, v) => ((a[v.model] = (a[v.model] || 0) + 1), a), {}),
)
  .map(([label, count]) => ({ slug: slugOf(label), label, count }))
  .sort((a, b) => b.count - a.count);

/** Image models with their own page, most prompts first. Prompts that work in any model have none. */
export const imageModels = Object.entries(
  images.reduce<Record<string, number>>((a, p) => (p.model !== 'Any image model' && (a[p.model] = (a[p.model] || 0) + 1), a), {}),
)
  .map(([label, count]) => ({ slug: slugOf(label), label, count }))
  .sort((a, b) => b.count - a.count);
/** The model page for an image prompt's model, or '' when it has none. */
export const imageModelSlug = (label: string) => imageModels.find((m) => m.label === label)?.slug || '';

/** AI models that have text prompts, in a fixed order: used for the model filter. */
export const textModels = ['ChatGPT', 'Claude', 'Gemini', 'Any model']
  .map((label) => ({ slug: slugOf(label), label, count: texts.filter((t) => t.model === label).length }))
  .filter((m) => m.count);

/** Text prompt filters: the three prompt types, plus prompts flagged for developers. */
export const TEXT_FILTERS = ['text', 'structured', 'image', 'agent', 'developer'] as const;
export const inTextFilter = (t: TextPrompt, f: string) => (f === 'developer' ? t.forDevs : t.type === f);
export const textFilterCounts: Record<string, number> = Object.fromEntries(
  TEXT_FILTERS.map((f) => [f, texts.filter((t) => inTextFilter(t, f)).length]),
);

/** Readable text from a prompt written as JSON: its string values, joined. Plain prompts pass through. */
const proseOf = (s: string) => {
  const t = s.trim();
  if (!/^[[{]/.test(t)) return s;
  try {
    const out: string[] = [];
    const walk = (v: unknown) => {
      if (typeof v === 'string') out.push(v);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(JSON.parse(t));
    // Skip short enum-like values ("16:9", "cinematic") at the start; keep the descriptive sentences.
    const prose = out.filter((x) => x.includes(' ')).join('. ');
    return prose || out.join(', ');
  } catch {
    // Not valid JSON: strip the punctuation so at least the words read cleanly.
    return t.replace(/["{}[\]]/g, ' ').replace(/\s*[:,]\s*/g, ', ').replace(/^,\s*/, '');
  }
};

/** Short plain-text summary for meta descriptions and cards. */
export const excerpt = (s: string, n = 140) => {
  const t = proseOf(s)
    .replace(/\{argument name="[^"]*" default="([^"]*)"\}/g, '$1') // template slots read as their default
    .replace(/[*#`>|_]{1,}/g, ' ') // Markdown marks
    .replace(/(^|\s)-\s+/g, '$1') // list dashes
    .replace(/\s+/g, ' ')
    .replace(/(\.\s*){2,}/g, '. ')
    .trim();
  return t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t;
};

/**
 * Meta description for a prompt page: the source's own summary when it has one, otherwise the
 * title followed by the start of the prompt, so near-identical prompts still read differently.
 */
export const metaDescOf = (x: { title: string; desc?: string; prompt: string }, n = 155) => {
  if (x.desc) return excerpt(x.desc, n);
  const body = excerpt(x.prompt, n);
  if (body.toLowerCase().startsWith(x.title.toLowerCase().slice(0, 24))) return body;
  return `${x.title}: ${excerpt(x.prompt, Math.max(60, n - x.title.length - 2))}`;
};

export const fmt = (n: number) => n.toLocaleString('en-US');
export const pad = (n: number, w = 2) => String(n).padStart(w, '0');
