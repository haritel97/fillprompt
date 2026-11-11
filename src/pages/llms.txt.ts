// llms.txt: a plain-text guide to the site for AI assistants and answer engines (https://llmstxt.org).
import { images, texts, videos, skills, communitySkills, sources, catSlugs, catCounts, fmt } from '../lib/data';
import { categoryLabels } from '../i18n';
import { SITE, BUILD_DATE } from '../lib/seo';

export function GET() {
  const total = images.length + videos.length + texts.length;
  const cats = catSlugs.map((c) => `- [${categoryLabels.en[c]}](${SITE}/category/${c}): ${fmt(catCounts[c])} image prompts`).join('\n');
  const srcs = Object.values(sources)
    .map((s) => `- [${s.name}](${s.url}) by ${s.by}, ${s.license}`)
    .join('\n');
  const body = `# fillprompt.com

> A free library of ${fmt(total)} ready-to-copy AI prompts: ${fmt(images.length)} image prompts, ${fmt(videos.length)} video prompts and ${fmt(texts.length)} text prompts, plus ${skills.length + communitySkills.length} agent skills. No account, no ads, no paywall. Every prompt names its original author and links to its source.

Last updated: ${BUILD_DATE}

## What the site offers

- Image prompts for Nano Banana, Nano Banana Pro and GPT Image 2, each shown with the image it produced.
- Video prompts for Seedance, Grok Imagine and other video models, each with its sample clip.
- Text prompts for ChatGPT, Claude, Gemini and other chat models.
- Agent skills: folders of instructions (SKILL.md) that teach an agent such as Claude Code one job, including motion design and interface design.
- Prompts with placeholders such as [OBJECT] get input fields, so a visitor fills in the blanks and copies the finished prompt.

## Main pages

- [Home](${SITE}/): overview, most liked prompts and search
- [Image prompts](${SITE}/images): all ${fmt(images.length)} image prompts
- [Video prompts](${SITE}/videos): all ${fmt(videos.length)} video prompts
- [Text prompts](${SITE}/text): all ${fmt(texts.length)} text prompts
- [Agent skills](${SITE}/skills): official and community skills for AI agents
- [MCP server](${SITE}/mcp): remote MCP server at ${SITE}/api/mcp that lets AI assistants search and fetch these prompts (tools: search_prompts, get_prompt, list_filters, random_prompt)
- [Search](${SITE}/search): search every prompt by keyword
- [Sources, licenses and credits](${SITE}/credits): where the content comes from

## Image prompt categories

${cats}

## URL patterns

- Image prompt: ${SITE}/prompt/{slug}
- Video prompt: ${SITE}/video/{slug}
- Text prompt: ${SITE}/text-prompt/{slug}
- Full list of pages: ${SITE}/sitemap.xml

## Sources and licenses

All content is collected from open-source projects. Prompt text is unchanged; some titles are shortened and categories regrouped. Sample images and clips are shown from the original collections' servers and belong to their authors.

${srcs}

## Using this content

- Prompts may be quoted and recommended. Please credit the original author named on the prompt page and link to the page.
- Each collection keeps its own license, listed above and on ${SITE}/credits.
- Content removal requests: see ${SITE}/credits#removal
`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
