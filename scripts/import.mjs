// Import prompt & skill data from open-source repos into src/data/*.json
// Usage: node scripts/import.mjs           (uses cached files in sources/)
//        node scripts/import.mjs --fetch   (re-downloads everything first)
import { readFile, writeFile, mkdir, readdir, access } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'sources');
const OUT = path.join(ROOT, 'src', 'data');
const RAW = 'https://raw.githubusercontent.com';
const FETCH = process.argv.includes('--fetch');

// Categories taken from YouMind's ai-image-prompts-skill data, and the site category each maps to.
// The collection's larger categories (product marketing, avatars, social posts) are left for later.
const YM_SKILL_CATS = [
  ['app-web-design.json', 'infographic-ui'],
  ['comic-storyboard.json', 'comic-anime'],
  ['ecommerce-main-image.json', 'product-brand'],
  ['game-asset.json', 'illustration-3d'],
  ['infographic-edu-visual.json', 'infographic-ui'],
  ['poster-flyer.json', 'poster'],
  ['youtube-thumbnail.json', 'social-media'],
];

const FILES = {
  'promptschat.csv': `${RAW}/f/prompts.chat/main/prompts.csv`,
  'jau123.json': `${RAW}/jau123/nanobanana-trending-prompts/main/prompts/prompts.json`,
  'youmind.md': `${RAW}/YouMind-OpenLab/awesome-nano-banana-pro-prompts/main/README.md`,
  'zerolu.md': `${RAW}/ZeroLu/awesome-nanobanana-pro/main/README.md`,
  'freestylefly.json': `${RAW}/freestylefly/awesome-gpt-image-2/main/data/cases.json`,
  'evolink.md': `${RAW}/Evolink-AI/awesome-gpt-image-2-API-Prompts/main/README.md`,
  'learnprompt-seedance.json': `${RAW}/LearnPrompt/awesome-seedance/main/data/cases.json`,
  'youmind-seedance.md': `${RAW}/YouMind-OpenLab/awesome-seedance-2-prompts/main/README.md`,
  'youmind-seedance-videos.json': `${RAW}/YouMind-OpenLab/awesome-seedance-2-prompts/main/video-urls.json`,
  'osw-seedance.json': `${RAW}/opensource-works/awesome-seedance-prompts/main/data/posts.json`,
  'osw-mirror.json': `${RAW}/opensource-works/awesome-seedance-prompts/main/data/mirror.json`,
  'youmind-gemini3.md': `${RAW}/YouMind-OpenLab/awesome-gemini-3-prompts/main/README.md`,
  'youmind-gptimage2.md': `${RAW}/YouMind-OpenLab/awesome-gpt-image-2/main/README.md`,
  'youmind-gptimage15.md': `${RAW}/YouMind-OpenLab/awesome-gpt-image-1.5/main/README.md`,
  'youmind-seedream.md': `${RAW}/YouMind-OpenLab/awesome-seedream-4.5/main/README.md`,
  'devanshug.md': `${RAW}/devanshug2307/Awesome-AI-Image-Prompts/main/README.md`,
  'evolink-h3.md': `${RAW}/Evolink-AI/awesome-minimax-H3-prompts/main/README.md`,
  ...Object.fromEntries(
    YM_SKILL_CATS.map(([file]) => [`youmind-skill-${file}`, `${RAW}/YouMind-OpenLab/ai-image-prompts-skill/main/references/${file}`]),
  ),
  'atlas-omni.json': `${RAW}/AtlasCloudAI/awesome-gemini-omni-prompts/main/data/prompts_by_locale/en-US.json`,
  'youmind-grok.md': `${RAW}/YouMind-OpenLab/awesome-grok-imagine-prompts/main/README.md`,
  'youmind-grok-videos.json': `${RAW}/YouMind-OpenLab/awesome-grok-imagine-prompts/main/video-urls.json`,
};

// Community skill repositories shown on the Skills page as links. Name, description, license and
// stars are read from the GitHub API; a repository is listed only if its license is one of OPEN.
// Licenses GitHub cannot detect (it reports NOASSERTION), read from each repository's LICENSE file.
const LICENSE_FIX = {
  'Alisa0808/vibe-creating-skill': 'MIT',
  'Evolink-AI/Awesome-Blender-Seedance-Workflow-Usecases': 'CC-BY-4.0',
};

const COMMUNITY = {
  motion: [
    'greensock/gsap-skills',
    'Vincentwei1021/video-shotcraft',
    'oil-oil/oil-motion',
    'mromidev/claude-animated-shorts',
    'NiazMorshed2007/reanimate',
    'echris6/motion-video-kit',
    'haidrrrry/claude-remotion-skill',
    'howseen-ai/claude-motion-design',
    'rossark0/rossark-motion-skill',
    'lovisdotio/motion2code',
    'iart-ai/web-animation-skills',
    'EL4CTEO/blender-skills',
    'dexhunter/seedance2-skill',
    'jnMetaCode/ai-shortfilm-prompts',
    'Rylaispirit/cinematic-video-prompt-skill',
    'frankxai/awesome-motion-design-agent-skills',
    'heygen-com/hyperframes',
    'digitalsamba/claude-code-video-toolkit',
    'adithya-s-k/manim_skill',
    'Dakkshin/after-effects-mcp',
    'Yusuke710/manim-skill',
    'audrey-560/hyperframes-cinematic-caption',
    // Video: editors and render tools driven through MCP, and video prompting skills.
    'ahujasid/mcp-for-blender',
    'samuelgursky/davinci-resolve-mcp',
    'hetpatel-11/Adobe_Premiere_Pro_MCP',
    'leancoderkavy/premiere-pro-mcp',
    'SamurAIGPT/AI-Faceless-Video-Generator',
    'Moessif/code-video-showcase',
    'Evolink-AI/Awesome-Blender-Seedance-Workflow-Usecases',
    'KyaniteLabs/kinocut',
    'Square-Zero-Labs/video-prompting-skill',
    'Alisa0808/vibe-creating-skill',
    'video-creator/ffmpeg-mcp',
    'Melvynx/video-agent-skills',
    'mrbuslov/capcut-ai-editor',
    'zhouwei713/fpv-immersive-video-prompting',
    'anymotion-agent/anymotion',
  ],
  design: [
    'Nutlope/hallmark',
    'google-labs-code/stitch-skills',
    'plugin87/ux-ui-agent-skills',
    'oil-oil/oil-ui',
    'freshtechbro/claudedesignskills',
    'rohitg00/awesome-claude-design',
  ],
  more: [
    'sickn33/agentic-awesome-skills',
    'github/awesome-copilot',
    'VoltAgent/awesome-agent-skills',
    'coreyhaines31/marketingskills',
    'K-Dense-AI/scientific-agent-skills',
    'gamedev-skills/awesome-gamedev-agent-skills',
  ],
};
const OPEN = new Set(['MIT', 'Apache-2.0', 'CC0-1.0', 'CC-BY-4.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC']);

export const SOURCES = {
  jau123: {
    name: 'NanoBanana Trending Prompts',
    by: 'MeiGen.ai',
    url: 'https://github.com/jau123/nanobanana-trending-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  youmind: {
    name: 'Awesome Nano Banana Pro Prompts',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  zerolu: {
    name: 'Awesome Nano Banana Pro',
    by: 'ZeroLu',
    url: 'https://github.com/ZeroLu/awesome-nanobanana-pro',
    license: 'MIT',
    licenseUrl: 'https://github.com/ZeroLu/awesome-nanobanana-pro/blob/main/LICENSE',
  },
  freestylefly: {
    name: 'Awesome GPT Image 2',
    by: 'freestylefly',
    url: 'https://github.com/freestylefly/awesome-gpt-image-2',
    license: 'MIT',
    licenseUrl: 'https://github.com/freestylefly/awesome-gpt-image-2/blob/main/LICENSE',
  },
  evolink: {
    name: 'Awesome GPT Image 2 API & Prompts',
    by: 'EvoLink AI',
    url: 'https://github.com/Evolink-AI/awesome-gpt-image-2-API-Prompts',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  learnprompt: {
    name: 'Awesome Seedance',
    by: 'LearnPrompt',
    url: 'https://github.com/LearnPrompt/awesome-seedance',
    license: 'MIT',
    licenseUrl: 'https://github.com/LearnPrompt/awesome-seedance/blob/main/LICENSE',
  },
  youmindseedance: {
    name: 'Awesome Seedance 2 Prompts',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  oswseedance: {
    name: 'Awesome Seedance Prompts',
    by: 'opensource-works',
    url: 'https://github.com/opensource-works/awesome-seedance-prompts',
    license: 'MIT',
    licenseUrl: 'https://github.com/opensource-works/awesome-seedance-prompts/blob/main/LICENSE',
  },
  youmindgrok: {
    name: 'Awesome Grok Imagine Prompts',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-grok-imagine-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  youmindgptimage2: {
    name: 'Awesome GPT Image 2',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-gpt-image-2',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  youmindgptimage15: {
    name: 'Awesome GPT Image 1.5',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-gpt-image-1.5',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  youmindseedream: {
    name: 'Awesome Seedream 4.5',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-seedream-4.5',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  devanshug: {
    name: 'Awesome AI Image Prompts',
    by: 'devanshug2307',
    url: 'https://github.com/devanshug2307/Awesome-AI-Image-Prompts',
    license: 'MIT',
    licenseUrl: 'https://github.com/devanshug2307/Awesome-AI-Image-Prompts/blob/main/LICENSE',
  },
  evolinkh3: {
    name: 'Awesome MiniMax H3 Prompts',
    by: 'EvoLink AI',
    url: 'https://github.com/Evolink-AI/awesome-minimax-H3-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  youmindskill: {
    name: 'AI Image Prompts',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/ai-image-prompts-skill',
    license: 'MIT',
    licenseUrl: 'https://github.com/YouMind-OpenLab/ai-image-prompts-skill/blob/main/LICENSE',
  },
  atlasomni: {
    name: 'Awesome Gemini Omni Prompts',
    by: 'Atlas Cloud',
    url: 'https://github.com/AtlasCloudAI/awesome-gemini-omni-prompts',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  promptschat: {
    name: 'prompts.chat',
    by: 'Fatih Kadir Akın & contributors',
    url: 'https://github.com/f/prompts.chat',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  voltagent: {
    name: 'Awesome Claude Code Subagents',
    by: 'VoltAgent',
    url: 'https://github.com/VoltAgent/awesome-claude-code-subagents',
    license: 'MIT',
    licenseUrl: 'https://github.com/VoltAgent/awesome-claude-code-subagents/blob/main/LICENSE',
  },
  wshobson: {
    name: 'Claude Code Agents',
    by: 'Seth Hobson',
    url: 'https://github.com/wshobson/agents',
    license: 'MIT',
    licenseUrl: 'https://github.com/wshobson/agents/blob/main/LICENSE',
  },
  geminisubagents: {
    name: 'Awesome Gemini CLI Subagents',
    by: 'Joseph Hampton',
    url: 'https://github.com/JosephHampton/awesome-gemini-cli-subagents',
    license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
  youmindgemini: {
    name: 'Awesome Gemini 3 Prompts',
    by: 'YouMind OpenLab',
    url: 'https://github.com/YouMind-OpenLab/awesome-gemini-3-prompts',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  },
  mustvlad: {
    name: 'ChatGPT System Prompts',
    by: 'mustvlad',
    url: 'https://github.com/mustvlad/ChatGPT-System-Prompts',
    license: 'MIT',
    licenseUrl: 'https://github.com/mustvlad/ChatGPT-System-Prompts/blob/main/LICENSE',
  },
  fabric: {
    name: 'Fabric patterns',
    by: 'Daniel Miessler',
    url: 'https://github.com/danielmiessler/Fabric',
    license: 'MIT',
    licenseUrl: 'https://github.com/danielmiessler/Fabric/blob/main/LICENSE',
  },
  llmpromptlibrary: {
    name: 'LLM Prompt Library',
    by: 'abilzerian',
    url: 'https://github.com/abilzerian/LLM-Prompt-Library',
    license: 'MIT',
    licenseUrl: 'https://github.com/abilzerian/LLM-Prompt-Library/blob/main/LICENSE',
  },
  anthropic: {
    name: 'Anthropic Skills',
    by: 'Anthropic',
    url: 'https://github.com/anthropics/skills',
    license: 'Per-skill license',
    licenseUrl: 'https://github.com/anthropics/skills',
  },
};

// Unified category slugs for image prompts. Labels live in src/i18n.ts.
export const CATEGORIES = [
  'portrait-avatar',
  'photography',
  'product-brand',
  'food-drink',
  'poster',
  'social-media',
  'infographic-ui',
  'illustration-3d',
  'comic-anime',
  'creative',
];

const CAT_RULES = [
  [/profile|avatar|portrait|selfie|headshot/i, 'portrait-avatar'],
  [/food|drink/i, 'food-drink'],
  [/product|brand|e-?commerce|fashion/i, 'product-brand'],
  [/poster|flyer/i, 'poster'],
  [/social|youtube|thumbnail/i, 'social-media'],
  [/infographic|ui|app|web|diagram|education|knowledge|workplace|productivity|typography/i, 'infographic-ui'],
  [/comic|storyboard|anime|manga/i, 'comic-anime'],
  [/photo|cinematic|realis/i, 'photography'],
  [/illustration|3d|game|render|interior|design|character/i, 'illustration-3d'],
];
const catFor = (label) => (CAT_RULES.find(([re]) => re.test(label)) || [null, 'creative'])[1];

// Video categories derived from title / description / prompt keywords.
// Title and description are scored higher than the long prompt text.
// All patterns use word boundaries to avoid partial matches (e.g. "ad" in "made").
const VIDEO_CAT_RULES = [
  [/\banime\b|\banimation\b|\banimated\b|\bcartoon\b|\bmanga\b|\bghibli\b|\bpixar\b|\bclaymation\b|\bstop\s*motion\b|\b3d\s*animation\b/i, 'anime and animation'],
  [/\bfilm\b|\bmovie\b|\bhollywood\b|\bcinematography\b|\bdrama\b|\bcinema\b|\btheatrical\b/i, 'cinematic'],
  [/\bproduct\b|\bad\b|\bcommercial\b|\bugc\b|\bshowcase\b|\breview\b|\bunboxing\b|\bbrand\b|\bfashion\b|\bbeauty\b|\bskincare\b/i, 'product and ads'],
  [/\bnature\b|\btravel\b|\blandscape\b|\bmountain\b|\bocean\b|\bforest\b|\bwildlife\b|\bscenic\b|\bvlog\b|\bjourney\b|\btrip\b|\bdestination\b/i, 'nature and travel'],
  [/\baction\b|\bfight\b|\bbattle\b|\bchase\b|\bsport\b|\bracing\b|\bexplosion\b|\bcombat\b/i, 'action'],
];
const videoCatFor = (title, desc, prompt) => {
  const scores = {};
  for (const [, cat] of VIDEO_CAT_RULES) scores[cat] = 0;
  const count = (re, text) => (text.match(re) || []).length;
  for (const [re, cat] of VIDEO_CAT_RULES) {
    const g = new RegExp(re.source, 'gi');
    scores[cat] += count(g, title) * 3; // title is most specific
    scores[cat] += count(g, desc) * 2;  // description next
    scores[cat] += count(g, prompt) * 1; // prompt text is longest, least weight
  }
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'other';
};

// Keep the site family-friendly.
// Deliberately strict: a few harmless prompts are dropped as false positives.
const BLOCK = new RegExp(
  '\\b(' +
    [
      'lingerie|bikini|nude|naked|sexy|seductive|cleavage|underwear|bra|braless|bralette|erotic|sensual|nsfw|busty',
      "thong|camisole|victoria'?s secret|jailbreak|uncensored|porn\\w*|fetish|midriff|navel|sultry|alluring",
      'skin-?tight|crop top|plunging|backless|bodysuit|bodycon|swimsuit|swimwear|mini ?skirt|short shorts|thighs?',
      'curvy|hourglass|boudoir|low-cut|deep neckline|d[eé]collet\\w*|provocative|shirtless|topless|stockings|corset',
      'bust|hips|booty|flirt\\w*|temptress|pin-?up|see-through|sheer|tank top|tight (dress|top)',
      'bare (shoulders?|skin|legs|back|chest)|wet (hair|skin|shirt|look)',
    ].join('|') +
    ')\\b',
  'i',
);

const exists = (p) => access(p).then(() => true, () => false);

async function fetchSources() {
  await mkdir(SRC, { recursive: true });
  for (const [file, url] of Object.entries(FILES)) {
    const dest = path.join(SRC, file);
    if (!FETCH && (await exists(dest))) continue;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log('downloaded', file);
  }
  const skills = path.join(SRC, 'anthropics-skills');
  if (!(await exists(skills))) {
    execFileSync('git', ['clone', '--depth', '1', '-q', 'https://github.com/anthropics/skills.git', skills]);
  } else if (FETCH) {
    execFileSync('git', ['-C', skills, 'pull', '-q', '--depth', '1']);
  }
}

const slugify = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '');

function titleFromPrompt(prompt, fallback) {
  const line = prompt
    .split('\n')
    .map((l) => l.trim())
    .find((l) => /[a-zA-Z]{4}/.test(l) && !/^[{[\]}"]/.test(l));
  if (!line) return fallback;
  let t = line
    .replace(/\{argument name="[^"]*" default="([^"]*)"\}/g, '$1') // template slots read as their default
    .replace(/^[#>*\-\s]+/, '')
    .replace(/[*_`]/g, '');
  const stop = t.search(/[.!?:;](\s|$)/);
  if (stop > 20) t = t.slice(0, stop);
  if (t.length > 72) t = t.slice(0, 72).replace(/\s+\S*$/, '') + '…';
  return t.length > 12 ? t : fallback;
}

const tweetId = (url) => (url && url.match(/status\/(\d+)/) || [])[1];

function importJau123(raw) {
  const label = { nanobanana: 'Nano Banana', gptimage: 'GPT Image' };
  return JSON.parse(raw).map((x) => ({
    id: `m${x.id}`,
    title: titleFromPrompt(x.prompt, `${x.categories[0] || 'Prompt'} #${x.rank}`),
    desc: '',
    prompt: x.prompt.trim(),
    images: x.images?.length ? x.images : [x.image].filter(Boolean),
    cats: [...new Set(x.categories.map(catFor))],
    model: label[x.model] || x.model,
    author: x.author_name || x.author,
    authorUrl: x.author ? `https://x.com/${x.author}` : '',
    sourceUrl: x.source_url,
    date: x.date || '',
    likes: x.likes || 0,
    source: 'jau123',
  }));
}

// YouMind's image collections share one README layout; each is imported with its own model and source.
function importYoumind(md, { model = 'Nano Banana Pro', source = 'youmind', prefix = 'y' } = {}) {
  const parts = md.split(/^### No\. \d+: /m).slice(1);
  return parts.map((p) => {
    const heading = p.slice(0, p.indexOf('\n')).trim();
    const dash = heading.indexOf(' - ');
    const catLabel = dash > 0 ? heading.slice(0, dash) : '';
    const title = dash > 0 ? heading.slice(dash + 3) : heading;
    const desc = (p.match(/#### 📖 Description\s+([\s\S]*?)\n#### /) || [])[1]?.trim() || '';
    let prompt = (p.match(/#### 📝 Prompt\s+```[^\n]*\n([\s\S]*?)\n```\s*\n+#### /) || [])[1] || '';
    const images = [...p.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]);
    const author = p.match(/\*\*Author:\*\* \[([^\]]+)\]\(([^)]+)\)/);
    // Some entries list their source as "(null)"; those have no link.
    const sourceUrl = (p.match(/\*\*Source:\*\* \[[^\]]+\]\((https?:[^)]+)\)/) || [])[1] || '';
    const published = (p.match(/\*\*Published:\*\* (.+)/) || [])[1] || '';
    const d = published ? new Date(published + ' UTC') : null;
    return {
      id: `${prefix}${tweetId(sourceUrl) || slugify(title)}`,
      title,
      desc,
      prompt: prompt.trim(),
      images,
      // Newer YouMind collections have no category in the heading, so the description helps place them.
      cats: [catFor(catLabel || (source === 'youmind' ? title : `${title} ${desc}`))],
      model,
      author: author?.[1] || '',
      authorUrl: author?.[2] || '',
      sourceUrl,
      date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : '',
      likes: 0,
      source,
    };
  });
}

function importZerolu(md) {
  const out = [];
  const sections = md.split(/^## (?=\d+\. )/m).slice(1);
  for (const sec of sections) {
    const secTitle = sec.slice(0, sec.indexOf('\n')).replace(/^\d+\.\s*/, '').trim();
    const items = sec.split(/^### \d+\.\d+\.? /m).slice(1);
    for (const p of items) {
      const title = p.slice(0, p.indexOf('\n')).trim();
      const desc = (p.match(/^\*([^*\n][^\n]*?)\*\s*$/m) || [])[1] || '';
      const prompt = (p.match(/```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || '';
      const images = [...p.matchAll(/<img[^>]*\ssrc="([^"]+)"/g)].map((m) => m[1]);
      const src = p.match(/\*Source: \[([^\]]+)\]\(([^)]+)\)/);
      const handle = src?.[1]?.startsWith('@') ? src[1].slice(1) : '';
      out.push({
        id: `z${tweetId(src?.[2]) || slugify(title)}`,
        title,
        desc: /^Source:/.test(desc) ? '' : desc,
        prompt: prompt.trim(),
        images,
        cats: [catFor(secTitle)],
        model: 'Nano Banana Pro',
        author: handle ? `@${handle}` : src?.[1] || '',
        authorUrl: handle ? `https://x.com/${handle}` : '',
        sourceUrl: src?.[2] || '',
        date: '',
        likes: 0,
        source: 'zerolu',
      });
    }
  }
  return out;
}

// The site is English and Malay: skip prompts written mostly in Chinese, Japanese or Korean.
const english = (s) => (s.match(/[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/g) || []).length / Math.max(1, s.length) < 0.05;
const xUrl = (handle) => (handle?.startsWith('@') ? `https://x.com/${handle.slice(1)}` : '');

function importFreestylefly(raw) {
  // Titles in this collection are Chinese, so the title is taken from the prompt's first line.
  return JSON.parse(raw)
    .cases.filter((c) => c.prompt && english(c.prompt))
    .map((c) => ({
      id: `f${tweetId(c.sourceUrl) || c.id}`,
      title: titleFromPrompt(c.prompt, `${c.category} #${c.id}`),
      desc: '',
      prompt: c.prompt.trim(),
      images: c.image ? [`${RAW}/freestylefly/awesome-gpt-image-2/main/data${c.image}`] : [],
      cats: [catFor(c.category)],
      model: 'GPT Image 2',
      author: c.sourceLabel || '',
      authorUrl: xUrl(c.sourceLabel),
      sourceUrl: c.sourceUrl || '',
      date: '',
      likes: 0,
      source: 'freestylefly',
    }));
}

function importEvolink(md) {
  // Cases sit under category anchors; a prompt may itself contain "## " lines, so split on case headings only.
  const out = [];
  const marks = [...md.matchAll(/^<a id="category-([a-z-]+)"><\/a>|^### Case \d+: (.*)$/gm)];
  let cat = '';
  marks.forEach((m, i) => {
    if (m[1]) return void (cat = m[1]);
    const body = md.slice(m.index, marks[i + 1]?.index ?? md.length);
    const head = m[2].match(/^\[(.+?)\]\((\S+?)\)(?: \(by \[([^\]]+)\]\(([^)]+)\)\))?/);
    if (!head) return;
    const prompt = (body.match(/\*\*Prompt:\*\*\s*\n+```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || '';
    // Some cases reference images by a path inside the repo; make those absolute so they load from our pages.
    const images = [...body.matchAll(/<img src="([^"]+)"/g)]
      .map((x) => x[1])
      .filter((u) => !/shields\.io/.test(u))
      .map((u) => (/^https?:\/\//.test(u) ? u : `${RAW}/Evolink-AI/awesome-gpt-image-2-API-Prompts/main/${u.replace(/^\.?\//, '')}`));
    out.push({
      id: `e${tweetId(head[2]) || slugify(head[1])}`,
      title: head[1].trim(),
      desc: '',
      prompt: prompt.trim(),
      images: [...new Set(images)],
      cats: [catFor(`${cat} ${head[1]}`)],
      model: 'GPT Image 2',
      author: head[3] || '',
      authorUrl: head[4] || '',
      sourceUrl: head[2],
      date: '',
      likes: 0,
      source: 'evolink',
    });
  });
  return out.filter((x) => english(x.prompt) && english(x.title));
}

function importDevanshug(md) {
  // Numbered sections hold "### 1.2. Title" items: image, one-line summary, prompt (often JSON), X source.
  // The collection names no model per prompt, so it is read from the text when one is mentioned.
  const out = [];
  for (const sec of md.split(/^## (?=\d+\. )/m).slice(1)) {
    const secTitle = sec.slice(0, sec.indexOf('\n')).replace(/^\d+\.\s*/, '').replace(/[^\w &-]/g, '').trim();
    for (const p of sec.split(/^### \d+\.\d+\.? /m).slice(1)) {
      const title = p.slice(0, p.indexOf('\n')).trim();
      const images = [...p.matchAll(/!\[[^\]]*\]\((https?:[^)\s]+)\)/g)].map((m) => m[1]);
      const desc = (p.match(/!\[[^\]]*\]\([^)]+\)\s*\n+([^\n*!#`][^\n]+)/) || [])[1]?.trim() || '';
      const prompt = (p.match(/\*\*Prompt:\*\*\s*\n+```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || '';
      const src = p.match(/\*\*Source:\*\* \[([^\]]+)\]\((https?:[^)]+)\)/);
      const text = `${title} ${desc} ${prompt}`;
      const model = /nano banana pro/i.test(text)
        ? 'Nano Banana Pro'
        : /nano banana/i.test(text)
          ? 'Nano Banana'
          : /gpt[- ]?image/i.test(text)
            ? 'GPT Image'
            : 'Any image model';
      out.push({
        id: `d${tweetId(src?.[2]) || slugify(title)}`,
        title,
        desc,
        prompt: prompt.trim(),
        images,
        cats: [catFor(`${secTitle} ${title}`)],
        model,
        author: src?.[1] || '',
        authorUrl: src?.[2]?.match(/^https:\/\/x\.com\/[^/]+/)?.[0] || '',
        sourceUrl: src?.[2] || '',
        date: '',
        likes: 0,
        source: 'devanshug',
      });
    }
  }
  return out.filter((x) => english(x.prompt) && english(x.title));
}

// EvoLink's video collections: "### Case N: [Title](link) (by [author](url)) `mode`", a clip, then the prompt.
// `only` keeps cases whose mode matches, e.g. text-to-video, since the others need the user's own input media.
function importEvolinkVideos(md, { model, source, prefix, only }) {
  return md
    .split(/^### Case \d+: /m)
    .slice(1)
    .map((p) => {
      const head = p.slice(0, p.indexOf('\n'));
      const m = head.match(/^\[(.+?)\]\((\S+?)\)(?: \(by \[([^\]]+)\]\(([^)]+)\)\))?\s*(?:`([^`]*)`)?/);
      if (!m || (only && !only.test(m[5] || ''))) return null;
      const prompt = (p.match(/\*\*Prompt:\*\*[\s\S]*?```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || '';
      const video = (p.match(/<video src="([^"]+)"/) || p.match(/href="([^"]+\.mp4)"/) || [])[1] || '';
      const onX = /^https:\/\/(x|twitter)\.com\//.test(m[2]);
      return {
        id: `${prefix}${tweetId(m[2]) || slugify(m[1])}`,
        title: m[1].trim(),
        desc: '',
        prompt: prompt.trim(),
        cats: [videoCatFor(m[1], '', prompt)],
        poster: '',
        video,
        model,
        author: m[3] || '',
        authorUrl: m[4] || '',
        sourceUrl: onX ? m[2] : '',
        date: '',
        likes: 0,
        source,
      };
    })
    .filter((x) => x && english(x.prompt) && english(x.title));
}

function importAtlasOmni(raw) {
  // Only the collection's own text-to-video examples: its "Twitter Community" entries are post text, not
  // prompts, and the others edit a video or image the user supplies.
  const j = JSON.parse(raw);
  const list = Array.isArray(j) ? j : j.prompts || Object.values(j)[0];
  return list
    .filter((x) => x.video_url && x.category === 'Atlas Generated T2V' && x.prompt && x.title)
    .map((x) => ({
      id: `a${x.id}`,
      title: x.title.trim(),
      desc: (x.description || '').trim(),
      prompt: x.prompt.trim(),
      cats: [videoCatFor(x.title, x.description || '', x.prompt)],
      poster: '',
      video: x.video_url,
      model: 'Gemini Omni',
      author: 'Atlas Cloud',
      authorUrl: 'https://www.atlascloud.ai',
      sourceUrl: '',
      date: '',
      likes: 0,
      source: 'atlasomni',
    }))
    .filter((x) => english(x.prompt) && english(x.title));
}

function importYoumindSkill(raw, cat) {
  // Community prompts collected by YouMind, each with the image it made. The data names no author or
  // model, so the collection is credited and the model is left open. Prompts that need the user's own
  // reference image are left out.
  return JSON.parse(raw)
    .filter((x) => !x.needReferenceImages && x.content && x.title && x.sourceMedia?.length)
    .map((x) => ({
      id: `p${x.id}`,
      title: x.title.trim(),
      desc: (x.description || '').trim(),
      prompt: x.content.trim(),
      images: x.sourceMedia.filter((u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u)),
      cats: [cat],
      model: 'Any image model',
      author: '',
      authorUrl: '',
      sourceUrl: '',
      date: '',
      likes: 0,
      source: 'youmindskill',
    }))
    .filter((x) => english(x.prompt) && english(x.title));
}

function importLearnPrompt(raw) {
  return JSON.parse(raw)
    .cases.filter((c) => c.mediaType === 'video' && c.titleEn && c.promptFull && english(c.promptFull))
    .map((c) => ({
      id: `l${tweetId(c.sourceUrl) || c.slug}`,
      title: c.titleEn.trim(),
      desc: (c.summaryEn || '').trim(),
      prompt: c.promptFull.trim(),
      cats: [videoCatFor(c.titleEn, c.summaryEn || '', c.promptFull)],
      poster: c.posterUrl || '',
      video: c.mediaUrl || '',
      model: c.models?.[0] || 'Seedance',
      author: c.creator || '',
      authorUrl: xUrl(c.creator),
      sourceUrl: c.sourceUrl || '',
      date: (c.sourcePublishedAt || '').slice(0, 10),
      likes: c.weightedInteractions || 0,
      source: 'learnprompt',
    }));
}

function importYoumindVideos(md, videoMap, { idParam, model, source, prefix }) {
  const videos = JSON.parse(videoMap).prompts || {};
  return md
    .split(/^### /m)
    .slice(1)
    .filter((p) => p.includes('#### 📝 Prompt'))
    .map((p) => {
      const title = p.slice(0, p.indexOf('\n')).replace(/^No\. \d+:\s*/, '').trim();
      const desc =
        (p.match(/#### 📖 Description\s+([\s\S]*?)\n#### /) || [])[1]?.trim() || (p.match(/^> (.+)$/m) || [])[1]?.trim() || '';
      const prompt = (p.match(/#### 📝 Prompt\s+```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || '';
      const poster = ([...p.matchAll(/<img src="([^"]+)"/g)].map((m) => m[1]).find((u) => !/shields\.io/.test(u))) || '';
      const id = (p.match(new RegExp(idParam + '\\?id=(\\d+)')) || [])[1] || '';
      const author = p.match(/\*\*Author:\*\* \[([^\]]+)\]\(([^)]+)\)/);
      const sourceUrl = (p.match(/\*\*Source:\*\* \[[^\]]+\]\(([^)]+)\)/) || [])[1] || '';
      const published = (p.match(/\*\*Published:\*\* ([A-Za-z]+ \d+, \d{4})/) || [])[1] || '';
      const d = published ? new Date(published + ' UTC') : null;
      return {
        id: `${prefix}${tweetId(sourceUrl) || id || slugify(title)}`,
        title,
        desc,
        prompt: prompt.trim(),
        cats: [videoCatFor(title, desc, prompt)],
        poster,
        video: videos[id] || '',
        model,
        author: author?.[1] || '',
        authorUrl: author?.[2] || '',
        sourceUrl,
        date: d && !isNaN(d) ? d.toISOString().slice(0, 10) : '',
        likes: 0,
        source,
      };
    })
    .filter((x) => english(x.prompt) && english(x.title));
}

function importOswSeedance(raw, mirrorRaw) {
  // Seedance posts collected from X. Only posts whose prompt was published are used; the clip and
  // poster come from the collection's own mirror, falling back to the post's media.
  const mirror = JSON.parse(mirrorRaw);
  return JSON.parse(raw)
    .filter((x) => x.prompt && x.title && english(x.prompt) && english(x.title))
    .map((x) => ({
      id: `w${x.id}`,
      title: x.title.trim(),
      desc: '',
      prompt: x.prompt.trim(),
      cats: [videoCatFor(x.title, '', x.prompt)],
      poster: mirror[x.id]?.poster || x.video?.thumbnail || '',
      video: mirror[x.id]?.mp4 || x.video?.url || '',
      model: x.model || 'Seedance',
      author: x.author?.name || (x.author?.handle ? `@${x.author.handle}` : ''),
      authorUrl: x.author?.url || '',
      sourceUrl: x.url || '',
      date: x.date || '',
      likes: x.stats?.likes || 0,
      source: 'oswseedance',
    }));
}

async function importCommunity() {
  // Cached in sources/ so a normal import makes no API calls.
  const cache = path.join(SRC, 'community-skills.json');
  if (FETCH || !(await exists(cache))) {
    const rows = [];
    for (const [topic, repos] of Object.entries(COMMUNITY)) {
      for (const repo of repos) {
        // Without a token GitHub allows 60 calls an hour; set GITHUB_TOKEN to lift that.
        const auth = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
        const res = await fetch(`https://api.github.com/repos/${repo}`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'prompt-gallery-import', ...auth } });
        // A rate limit would leave most repositories out, so stop rather than write a partial list.
        if (res.status === 403 || res.status === 429) throw new Error(`GitHub rate limit at ${repo}; set GITHUB_TOKEN and run again`);
        if (!res.ok) {
          console.warn('skipped', repo, res.status);
          continue;
        }
        const r = await res.json();
        rows.push({
          name: r.name,
          by: r.owner.login,
          description: (r.description || '').replace(/\s+/g, ' ').trim(),
          license: LICENSE_FIX[repo] || r.license?.spdx_id || '',
          stars: r.stargazers_count,
          topic,
          url: r.html_url,
        });
      }
    }
    await writeFile(cache, JSON.stringify(rows, null, 2));
  }
  return JSON.parse(await readFile(cache, 'utf8'))
    .filter((s) => OPEN.has(s.license) && s.description && english(s.description))
    .sort((a, b) => b.stars - a.stars);
}

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const head = rows.shift();
  return rows.filter((r) => r.length === head.length).map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

function importPromptsChat(csv) {
  return parseCsv(csv).map((r) => ({
    title: r.act.trim(),
    prompt: r.prompt.trim(),
    type: (r.type || 'TEXT').toLowerCase(),
    forDevs: r.for_devs === 'TRUE',
    desc: '',
    model: 'ChatGPT',
    source: 'promptschat',
    author: r.contributor.trim() ? `@${r.contributor.trim()}` : '',
    authorUrl: r.contributor.trim() ? `https://github.com/${r.contributor.trim()}` : '',
    sourceUrl: '',
  }));
}

async function importSkills() {
  const dir = path.join(SRC, 'anthropics-skills', 'skills');
  const out = [];
  for (const name of (await readdir(dir)).sort()) {
    const file = path.join(dir, name, 'SKILL.md');
    if (!(await exists(file))) continue;
    const md = (await readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const fm = (md.match(/^---\r?\n([\s\S]*?)\r?\n---/) || [])[1] || '';
    // description may be a plain scalar or a block scalar (> or |)
    const m = fm.match(/^description:\s*(?:[>|][-+]?\s*\n((?:[ \t]+.*\n?)+)|(.*))$/m);
    const description = (m?.[1] || m?.[2] || '').replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim();
    const licFile = path.join(dir, name, 'LICENSE.txt');
    const lic = (await exists(licFile)) ? await readFile(licFile, 'utf8') : '';
    // 'apache' | 'proprietary' | 'none' — labels live in src/i18n.ts
    const license = /Apache License/i.test(lic) ? 'apache' : lic ? 'proprietary' : 'none';
    out.push({
      name,
      description,
      license,
      
      url: `https://github.com/anthropics/skills/tree/main/skills/${name}`,
    });
  }
  return out;
}

// ---------- Text prompt collections kept as shallow git clones under sources/ ----------
// name -> [repository, sparse path (only that folder is checked out) or null]
const TEXT_REPOS = {
  'repo-VoltAgent_awesome-claude-code-subagents': ['VoltAgent/awesome-claude-code-subagents', null],
  'repo-wshobson_agents': ['wshobson/agents', null],
  'repo-JosephHampton_awesome-gemini-cli-subagents': ['JosephHampton/awesome-gemini-cli-subagents', null],
  'repo-mustvlad_ChatGPT-System-Prompts': ['mustvlad/ChatGPT-System-Prompts', null],
  'repo-abilzerian_LLM-Prompt-Library': ['abilzerian/LLM-Prompt-Library', null],
  'repo-fabric': ['danielmiessler/Fabric', 'data/patterns'],
};

async function fetchTextRepos() {
  for (const [dir, [repo, sparse]] of Object.entries(TEXT_REPOS)) {
    const dest = path.join(SRC, dir);
    if (await exists(dest)) {
      if (FETCH) execFileSync('git', ['-C', dest, 'pull', '-q', '--depth', '1']);
      continue;
    }
    const url = `https://github.com/${repo}.git`;
    if (sparse) {
      execFileSync('git', ['clone', '--depth', '1', '-q', '--filter=blob:none', '--sparse', url, dest]);
      execFileSync('git', ['-C', dest, 'sparse-checkout', 'set', sparse]);
    } else {
      execFileSync('git', ['clone', '--depth', '1', '-q', url, dest]);
    }
    console.log('cloned', repo);
  }
}

/** Every .md file under a folder, as paths relative to it with forward slashes. */
async function walkMd(dir, rel = '') {
  const out = [];
  for (const e of await readdir(path.join(dir, rel), { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...(await walkMd(dir, p)));
    else if (e.name.endsWith('.md')) out.push(p);
  }
  return out.sort();
}

/** Split a markdown file into its YAML front matter (name and description only) and body. */
function frontMatter(raw) {
  const md = raw.replace(/\r\n/g, '\n');
  const m = md.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { data: {}, body: md.trim() };
  const pick = (key) => {
    const v = m[1].match(new RegExp(`^${key}:\\s*(?:[>|][-+]?\\s*\\n((?:[ \\t]+.*\\n?)+)|(.*))$`, 'm'));
    return (v?.[1] || v?.[2] || '').replace(/\s+/g, ' ').replace(/^["']|["']$/g, '').trim();
  };
  return { data: { name: pick('name'), description: pick('description') }, body: md.slice(m[0].length).trim() };
}

const ACRONYMS = {
  api: 'API', ui: 'UI', ux: 'UX', sql: 'SQL', ml: 'ML', ai: 'AI', seo: 'SEO', ios: 'iOS', php: 'PHP', css: 'CSS', html: 'HTML',
  cli: 'CLI', sre: 'SRE', qa: 'QA', llm: 'LLM', mcp: 'MCP', tdd: 'TDD', aws: 'AWS', gcp: 'GCP', hr: 'HR', pr: 'PR', ci: 'CI',
  cd: 'CD', json: 'JSON', yaml: 'YAML', graphql: 'GraphQL', devops: 'DevOps', mlops: 'MLOps', javascript: 'JavaScript',
  typescript: 'TypeScript', nextjs: 'Next.js', dotnet: '.NET', csharp: 'C#', cpp: 'C++', iot: 'IoT', rag: 'RAG', cto: 'CTO',
  nlp: 'NLP', kpi: 'KPI', saas: 'SaaS', b2b: 'B2B', osint: 'OSINT', pdf: 'PDF', dx: 'DX', wcag: 'WCAG', k8s: 'Kubernetes',
};
/** "api-designer" or "analyze_bill_short" -> "API Designer", "Analyze Bill Short". */
const humanize = (name) =>
  name
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((w) => ACRONYMS[w.toLowerCase()] || w[0].toUpperCase() + w.slice(1))
    .join(' ');

const textEntry = (x) => ({ type: 'text', forDevs: false, desc: '', author: '', authorUrl: '', sourceUrl: '', ...x });

/** Agent and command prompts stored as markdown files with front matter (Claude Code, Gemini CLI). */
async function importAgentFiles({ repoDir, match, kind, model, source, repo, suffix = '' }) {
  const root = path.join(SRC, repoDir);
  const out = [];
  for (const rel of await walkMd(root)) {
    if (!match.test(rel) || /(^|\/)README\.md$/i.test(rel)) continue;
    const { data, body } = frontMatter(await readFile(path.join(root, rel), 'utf8'));
    const name = data.name || rel.split('/').pop().replace(/\.md$/, '');
    if (body.length < 200) continue;
    out.push(
      textEntry({
        title: `${humanize(name)} ${kind}${suffix}`,
        desc: data.description,
        prompt: body,
        type: 'agent',
        forDevs: true,
        model,
        source,
        sourceUrl: `https://github.com/${repo}/blob/main/${rel.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
  }
  return out;
}

async function importMustvlad() {
  const root = path.join(SRC, 'repo-mustvlad_ChatGPT-System-Prompts');
  const out = [];
  for (const rel of await walkMd(root, 'prompts')) {
    const md = (await readFile(path.join(root, rel), 'utf8')).replace(/\r\n/g, '\n');
    const title = (md.match(/^# (.+)$/m) || [])[1]?.trim();
    const prompt = (md.match(/^## System Message\s*\n+([\s\S]*?)(?=\n## |$)/m) || [])[1]?.trim();
    if (!title || !prompt) continue;
    out.push(
      textEntry({
        title,
        prompt,
        model: 'ChatGPT',
        source: 'mustvlad',
        forDevs: /\/programming\//.test(rel),
        sourceUrl: `https://github.com/mustvlad/ChatGPT-System-Prompts/blob/main/${rel}`,
      }),
    );
  }
  return out;
}

async function importLlmPromptLibrary() {
  const root = path.join(SRC, 'repo-abilzerian_LLM-Prompt-Library');
  const out = [];
  for (const rel of await walkMd(root, 'prompts')) {
    const md = (await readFile(path.join(root, rel), 'utf8')).replace(/\r\n/g, '\n');
    const title = (md.match(/^# (.+)$/m) || [])[1]?.trim() || humanize(rel.split('/').pop().replace(/\.md$/, ''));
    // The prompt is the first fenced block; files without one are the prompt themselves.
    const prompt = ((md.match(/```[^\n]*\n([\s\S]*?)\n```/) || [])[1] || md.replace(/^# .+\n/, '')).trim();
    out.push(
      textEntry({
        title,
        prompt,
        model: 'Any model',
        source: 'llmpromptlibrary',
        forDevs: /\/programming\//.test(rel),
        sourceUrl: `https://github.com/abilzerian/LLM-Prompt-Library/blob/main/${rel.split('/').map(encodeURIComponent).join('/')}`,
      }),
    );
  }
  return out;
}

async function importFabric() {
  const root = path.join(SRC, 'repo-fabric', 'data', 'patterns');
  // One-line summaries: "12. **pattern_name**: What it does."
  const notes = {};
  const explain = path.join(root, 'pattern_explanations.md');
  if (await exists(explain)) {
    for (const m of (await readFile(explain, 'utf8')).matchAll(/^\d+\.\s+\*\*([a-z0-9_]+)\*\*:\s*(.+)$/gm)) notes[m[1]] = m[2].trim();
  }
  const out = [];
  for (const e of (await readdir(root, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(root, e.name, 'system.md');
    if (!e.isDirectory() || !(await exists(file))) continue;
    out.push(
      textEntry({
        title: humanize(e.name),
        desc: notes[e.name] || '',
        prompt: (await readFile(file, 'utf8')).replace(/\r\n/g, '\n').trim(),
        model: 'Any model',
        source: 'fabric',
        forDevs: /code|git|commit|pull_request|api|sql|regex|script|coding|software/.test(e.name),
        sourceUrl: `https://github.com/danielmiessler/Fabric/tree/main/data/patterns/${e.name}`,
      }),
    );
  }
  return out;
}

/** Gemini 3 prompts: same README layout as the other YouMind collections. */
function importYoumindGemini(md) {
  const seen = new Set();
  return importYoumind(md)
    .filter((x) => x.prompt && !seen.has(x.sourceUrl || x.title) && seen.add(x.sourceUrl || x.title))
    .map((x) =>
      textEntry({
        title: x.title,
        desc: x.desc,
        prompt: x.prompt,
        model: 'Gemini',
        source: 'youmindgemini',
        forDevs: /\b(html|css|javascript|three\.js|react|next\.js|svg|code|app|page|website)\b/i.test(`${x.title} ${x.prompt.slice(0, 400)}`),
        author: x.author,
        authorUrl: x.authorUrl,
        sourceUrl: x.sourceUrl,
      }),
    );
}

async function importAllTexts() {
  const chat = importPromptsChat(await read('promptschat.csv'));
  const added = [
    ...(await importAgentFiles({
      repoDir: 'repo-VoltAgent_awesome-claude-code-subagents',
      match: /^categories\/.+\.md$/,
      kind: 'agent',
      model: 'Claude',
      source: 'voltagent',
      repo: 'VoltAgent/awesome-claude-code-subagents',
    })),
    ...(await importAgentFiles({
      repoDir: 'repo-wshobson_agents',
      match: /^plugins\/[^/]+\/agents\/.+\.md$/,
      kind: 'agent',
      model: 'Claude',
      source: 'wshobson',
      repo: 'wshobson/agents',
    })),
    ...(await importAgentFiles({
      repoDir: 'repo-wshobson_agents',
      match: /^plugins\/[^/]+\/commands\/.+\.md$/,
      kind: 'command',
      model: 'Claude',
      source: 'wshobson',
      repo: 'wshobson/agents',
    })),
    ...(await importAgentFiles({
      repoDir: 'repo-JosephHampton_awesome-gemini-cli-subagents',
      match: /^agents\/.+\.md$/,
      kind: 'agent',
      model: 'Gemini',
      source: 'geminisubagents',
      suffix: ' (Gemini CLI)',
      repo: 'JosephHampton/awesome-gemini-cli-subagents',
    })),
    ...importYoumindGemini(await read('youmind-gemini3.md')),
    ...(await importMustvlad()),
    ...(await importFabric()),
    ...(await importLlmPromptLibrary()),
  ];
  return { chat, added };
}

/** Round-robin across AI models so a list page shows a mix instead of one collection at a time. */
function weaveByModel(list) {
  const order = ['ChatGPT', 'Claude', 'Gemini', 'Any model'];
  const groups = order.map((m) => list.filter((x) => x.model === m));
  const out = [];
  for (let i = 0; out.length < list.length; i++) for (const g of groups) if (g[i]) out.push(g[i]);
  return out;
}

function finalize(list, makeSlug) {
  const seen = new Set();
  return list.map((x) => {
    let slug = makeSlug(x), n = 2;
    const base = slug;
    while (seen.has(slug)) slug = `${base}-${n++}`;
    seen.add(slug);
    return { slug, ...x };
  });
}

await fetchSources();
await fetchTextRepos();
await mkdir(OUT, { recursive: true });
const read = (f) => readFile(path.join(SRC, f), 'utf8');

// Curated collections first so they win de-duplication; then trending by likes.
let images = [
  ...importYoumind(await read('youmind.md')),
  ...importZerolu(await read('zerolu.md')),
  ...importJau123(await read('jau123.json')).sort((a, b) => b.likes - a.likes),
  ...importFreestylefly(await read('freestylefly.json')),
  ...importEvolink(await read('evolink.md')),
  ...importYoumind(await read('youmind-gptimage2.md'), { model: 'GPT Image 2', source: 'youmindgptimage2', prefix: 'u' }),
  ...importYoumind(await read('youmind-seedream.md'), { model: 'Seedream 4.5', source: 'youmindseedream', prefix: 'r' }),
  ...importYoumind(await read('youmind-gptimage15.md'), { model: 'GPT Image 1.5', source: 'youmindgptimage15', prefix: 'o' }),
  ...importDevanshug(await read('devanshug.md')),
  ...(await Promise.all(YM_SKILL_CATS.map(async ([file, cat]) => importYoumindSkill(await read(`youmind-skill-${file}`), cat)))).flat(),
];
// Sample images that no longer load (checked by hand when the collection was added); those prompts are left out.
const DEAD_IMAGES = new Set([
  'https://pbs.twimg.com/media/G85m2KtagAAUNTc.jpg',
  'https://pbs.twimg.com/media/G9E6OtNXMAA-_qN.jpg',
  'https://pbs.twimg.com/media/G9vv-NzaEAApngM.jpg',
  'https://pbs.twimg.com/media/G9upjP8WUAAhiS6.jpg',
  'https://pbs.twimg.com/media/G9prmuIWIAARf3B.jpg',
  'https://pbs.twimg.com/media/G9pTHvaWgAE_my0.jpg',
  'https://pbs.twimg.com/media/G9bAlkCWgAArw7M.jpg',
  'https://pbs.twimg.com/media/G9aBRlXbkAAEyv0.jpg',
  'https://pbs.twimg.com/media/G9VHZCnW4AARq2C.jpg',
]);
const counts = { raw: images.length };
const seenKey = new Set();
// YouMind's skill data repeats prompts from collections above without their post IDs: match on the text.
const promptKey = (p) => p.replace(/\s+/g, ' ').trim().slice(0, 300).toLowerCase();
const seenPrompt = new Set();
images = images.filter((x) => {
  if (!x.prompt || x.prompt.length < 20 || !x.images.length || x.images.every((u) => DEAD_IMAGES.has(u))) return false;
  if (BLOCK.test(x.prompt) || BLOCK.test(x.title)) return false;
  const key = tweetId(x.sourceUrl) || x.id;
  if (seenKey.has(key)) return false;
  const pk = promptKey(x.prompt);
  if (x.source === 'youmindskill' && seenPrompt.has(pk)) return false;
  seenKey.add(key);
  seenPrompt.add(pk);
  return true;
});
images = finalize(images, (x) => `${slugify(x.title) || 'prompt'}-${x.id.slice(-6)}`).map(({ id, ...x }) => x);
// Two prompts may share a title (the slug is already unique): number the repeats so page titles differ.
const numberRepeats = (list) => {
  const seen = new Map();
  for (const x of list) {
    const k = x.title.toLowerCase();
    const c = (seen.get(k) || 0) + 1;
    seen.set(k, c);
    if (c > 1) x.title = `${x.title} #${c}`;
  }
  return list;
};
numberRepeats(images);

// Text prompts. prompts.chat goes first so its slugs stay what they were before the other
// collections were added; the list is woven by AI model afterwards, for display only.
const { chat, added } = await importAllTexts();
const textOk = (x) =>
  x.title && x.model && x.prompt.length >= 20 && english(x.prompt) && !BLOCK.test(x.title) && !BLOCK.test(x.prompt.slice(0, 3000));
const seenText = new Set();
// prompts.chat keeps exactly the rules it had before, so none of its pages disappear.
const chatOk = (x) => x.title && x.prompt.length >= 20 && !BLOCK.test(x.title) && !BLOCK.test(x.prompt.slice(0, 3000));
let texts = [
  ...chat.filter(chatOk),
  ...added.filter(textOk).filter((x) => {
    // The same agent often ships in more than one collection: keep the first copy of an identical prompt.
    const key = x.prompt.replace(/\s+/g, ' ').slice(0, 400);
    if (seenText.has(key)) return false;
    seenText.add(key);
    return true;
  }),
];
texts = weaveByModel(numberRepeats(finalize(texts, (x) => slugify(x.title) || 'prompt')));

// Video prompts: the evidence-led collection first (it carries the playable clip), most engaged first.
let videos = [
  ...importLearnPrompt(await read('learnprompt-seedance.json')).sort((a, b) => b.likes - a.likes),
  ...importOswSeedance(await read('osw-seedance.json'), await read('osw-mirror.json')).sort((a, b) => b.likes - a.likes),
  ...importYoumindVideos(await read('youmind-seedance.md'), await read('youmind-seedance-videos.json'), {
    idParam: 'seedance-2-0-prompts',
    model: 'Seedance 2.0',
    source: 'youmindseedance',
    prefix: 's',
  }),
  ...importYoumindVideos(await read('youmind-grok.md'), await read('youmind-grok-videos.json'), {
    idParam: 'grok-imagine-prompts',
    model: 'Grok Imagine',
    source: 'youmindgrok',
    prefix: 'g',
  }),
  ...importEvolinkVideos(await read('evolink-h3.md'), { model: 'MiniMax Hailuo 3', source: 'evolinkh3', prefix: 'h', only: /Text→Video/ }),
  ...importAtlasOmni(await read('atlas-omni.json')),
];
// Clips that no longer load from the collection's server (checked by hand); their prompts are left out.
const DEAD_CLIPS = new Set([
  'https://pub-62cf7640cd0f4066b60933bd2e9b85ef.r2.dev/github-repo-media/awesome-hailuo-3-prompts/assets/media/4cb51113a9afa5746d43b34ab1c3386660e0cdf3be64a5124be6453f830245b0-15-16-9-538390013432676361.mp4',
  'https://pub-62cf7640cd0f4066b60933bd2e9b85ef.r2.dev/github-repo-media/awesome-hailuo-3-prompts/assets/media/c56d7b71b17c955b57570c1c7fc2bd8bc18a61364bfd762f20665baa981ee0ff-20260728-175157.mp4',
]);
const rawVideos = videos.length;
const seenVideo = new Set();
videos = videos.filter((x) => {
  // A video prompt is listed only when it has both a playable clip and its prompt.
  if (!x.title || x.prompt.length < 20 || !x.video || DEAD_CLIPS.has(x.video)) return false;
  if (BLOCK.test(x.prompt) || BLOCK.test(x.title)) return false;
  const key = tweetId(x.sourceUrl) || x.id;
  if (seenVideo.has(key)) return false;
  seenVideo.add(key);
  return true;
});
videos = finalize(videos, (x) => `${slugify(x.title) || 'video'}-${x.id.slice(-6)}`).map(({ id, ...x }) => x);

const skills = await importSkills();
const community = await importCommunity();

await writeFile(path.join(OUT, 'image-prompts.json'), JSON.stringify(images));
await writeFile(path.join(OUT, 'text-prompts.json'), JSON.stringify(texts));
await writeFile(path.join(OUT, 'video-prompts.json'), JSON.stringify(videos));
await writeFile(path.join(OUT, 'skills.json'), JSON.stringify(skills, null, 2));
await writeFile(path.join(OUT, 'community-skills.json'), JSON.stringify(community, null, 2));
await writeFile(path.join(OUT, 'meta.json'), JSON.stringify({ sources: SOURCES, categories: CATEGORIES }, null, 2));

const by = (k) => images.reduce((a, x) => ((a[x[k]] = (a[x[k]] || 0) + 1), a), {});
console.log(`image prompts: ${images.length} of ${counts.raw} raw`, by('source'));
console.log('categories:', images.reduce((a, x) => (x.cats.forEach((c) => (a[c] = (a[c] || 0) + 1)), a), {}));
console.log(`text prompts: ${texts.length}`, texts.reduce((a, x) => ((a[`${x.model} / ${x.source}`] = (a[`${x.model} / ${x.source}`] || 0) + 1), a), {}));
console.log(`video prompts: ${videos.length} of ${rawVideos} raw`, videos.reduce((a, x) => ((a[x.source] = (a[x.source] || 0) + 1), a), {}), 'with clip:', videos.filter((x) => x.video).length);
console.log(`community skills: ${community.length}`, community.map((s) => `${s.by}/${s.name}=${s.license}`).join(', '));
console.log(`skills: ${skills.length}`, skills.map((s) => `${s.name}=${s.license}`).join(', '));
