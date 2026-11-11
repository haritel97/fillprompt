<div align="center">

<a href="https://fillprompt.com"><img src="public/favicon.svg" width="72" height="72" alt="fillprompt logo"></a>

# fillprompt

**Free, ready-to-copy AI prompts for images, video and text, each with a sample result.**<br>
Pick one, fill in the blanks, paste it into ChatGPT, Gemini, Claude or your video model. No account, no ads, no paywall.

[![CI](https://github.com/haritel97/fillprompt/actions/workflows/ci.yml/badge.svg)](https://github.com/haritel97/fillprompt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-ffd83d.svg)](LICENSE)
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-com.fillprompt%2Ffillprompt-151412.svg)](https://registry.modelcontextprotocol.io/v0/servers?search=fillprompt)
[![fillprompt MCP connector](https://glama.ai/mcp/connectors/com.fillprompt/fillprompt/badges/score.svg)](https://glama.ai/mcp/connectors/com.fillprompt/fillprompt)

[**Website**](https://fillprompt.com) · [**MCP server**](https://fillprompt.com/mcp) · [Image prompts](https://fillprompt.com/images) · [Video prompts](https://fillprompt.com/videos) · [Text prompts](https://fillprompt.com/text) · [Agent skills](https://fillprompt.com/skills)

<a href="https://fillprompt.com"><img src=".github/assets/home.jpg" alt="The fillprompt.com home page: AI prompts for product shots, ready to copy" width="100%"></a>

</div>

## What's inside

| | Count | Written for |
|---|---:|---|
| Image prompts | 2,149 | Nano Banana, Nano Banana Pro, GPT Image, GPT Image 2 |
| Video prompts | 906 | Seedance, Seedance 2.0 and 2.5, Grok Imagine |
| Text prompts | 3,657 | ChatGPT, Claude, Gemini, any model (roles, system prompts, agents) |
| Agent skills | 67 | Claude Code and other agents (links to their own repositories) |

- **Sample results.** Image and video prompts show the output they produced, loaded from the original collection.
- **Fill in the blanks.** Placeholders such as `[OBJECT]` or `{argument name="subject"}` become input fields, and the copy button gives the finished prompt.
- **Credit on every prompt.** Each one names its author, links to the original post and states the collection's license.
- **Built for agents too.** A free MCP server and a Claude Code plugin let your AI assistant search the library and fill a prompt in for you.
- **Fast and light.** A static site of about 7,000 pages, with a sitemap per content type and `llms.txt` for AI search.

## Use it from your AI assistant (MCP)

fillprompt runs a free, read-only remote MCP server, so Claude, Cursor, VS Code, ChatGPT and other MCP clients can search every prompt and fill one in for you. No account or API key.

```
https://fillprompt.com/api/mcp
```

**Claude Code**

```bash
claude mcp add --transport http fillprompt https://fillprompt.com/api/mcp
```

Or install the plugin, which adds the server plus a `fillprompt` skill:

```
/plugin marketplace add haritel97/fillprompt
/plugin install fillprompt@fillprompt
```

**Cursor** (`~/.cursor/mcp.json`)

```json
{ "mcpServers": { "fillprompt": { "url": "https://fillprompt.com/api/mcp" } } }
```

<img src=".github/assets/mcp.jpg" alt="The fillprompt MCP setup page" width="100%">

Tools: `search_prompts`, `get_prompt` (full text, fill-in slots, samples and author credit) `list_filters` and `random_prompt` (one prompt at random, with the same filters as the search). Usage is counted per day, tool and prompt type only (no queries or client details) in Supabase; `npm run stats:mcp` prints the last 30 days, and `supabase/mcp-usage.sql` creates the table. Setup for other clients: [fillprompt.com/mcp](https://fillprompt.com/mcp). The server lives in [`api/`](api) and the plugin in [`plugins/fillprompt`](plugins/fillprompt).

## Stack

- [Astro](https://astro.build) static site
- One Vercel Function for the MCP server ([`mcp-handler`](https://www.npmjs.com/package/mcp-handler) on the MCP SDK)
- [Tailwind CSS](https://tailwindcss.com) v4
- Hosted on [Vercel](https://vercel.com)
- Copy counter backed by two Supabase database functions (optional, see below)

## Getting started

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

The site runs at http://localhost:4321. The prompt data is already in `src/data/`, so no import step is needed to run it.

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Build the static site into `dist/` |
| `npm run preview` | Serve the built site locally |
| `npm run import` | Rebuild `src/data/*.json` from the files cached in `sources/` |
| `npm run import:fresh` | Download every source again, then import |
| `npm run brand` | Regenerate the share image, touch icon and donation QR |
| `npm test` | Data checks and MCP server tests |
| `npm run stats:mcp` | MCP usage for the last 30 days |

## Project layout

```
api/                  MCP server (Vercel Function) and the prompt search behind it
plugins/fillprompt/   Claude Code plugin: MCP config and the fillprompt skill
.claude-plugin/       Marketplace file, so `/plugin marketplace add haritel97/fillprompt` works
tests/                Data and MCP tests (node:test)
supabase/             SQL for the MCP usage counts
scripts/import.mjs    Downloads the source collections and writes src/data/*.json
scripts/og.mjs        Renders brand images
src/data/             Generated prompt data (committed, so the site builds without an import)
src/i18n.ts           Every interface string
src/lib/              Data access, route helpers, structured data, copy counter config
src/components/       Cards, prompt box, filters, pagination, logo
src/views/            Page bodies
src/pages/            Routes; each file picks a view and its static paths
src/styles/global.css Design tokens, light and dark themes
public/               Static files
vercel.json           Redirects and response headers
```

## Content sources

Defined in `scripts/import.mjs` (`SOURCES`) and listed on the site's Credits page.

| Collection | License | Used for |
|---|---|---|
| [jau123/nanobanana-trending-prompts](https://github.com/jau123/nanobanana-trending-prompts) | CC BY 4.0 | image prompts |
| [YouMind-OpenLab/awesome-nano-banana-pro-prompts](https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts) | CC BY 4.0 | image prompts |
| [ZeroLu/awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro) | MIT | image prompts |
| [freestylefly/awesome-gpt-image-2](https://github.com/freestylefly/awesome-gpt-image-2) | MIT | image prompts |
| [Evolink-AI/awesome-gpt-image-2-API-Prompts](https://github.com/Evolink-AI/awesome-gpt-image-2-API-Prompts) | CC0 1.0 | image prompts |
| [LearnPrompt/awesome-seedance](https://github.com/LearnPrompt/awesome-seedance) | MIT | video prompts |
| [opensource-works/awesome-seedance-prompts](https://github.com/opensource-works/awesome-seedance-prompts) | MIT | video prompts |
| [YouMind-OpenLab/awesome-seedance-2-prompts](https://github.com/YouMind-OpenLab/awesome-seedance-2-prompts) | CC BY 4.0 | video prompts |
| [YouMind-OpenLab/awesome-grok-imagine-prompts](https://github.com/YouMind-OpenLab/awesome-grok-imagine-prompts) | CC BY 4.0 | video prompts |
| [f/prompts.chat](https://github.com/f/prompts.chat) | CC0 1.0 (prompts) | text prompts (ChatGPT) |
| [mustvlad/ChatGPT-System-Prompts](https://github.com/mustvlad/ChatGPT-System-Prompts) | MIT | text prompts (ChatGPT) |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | MIT | agent prompts (Claude) |
| [wshobson/agents](https://github.com/wshobson/agents) | MIT | agent and command prompts (Claude) |
| [JosephHampton/awesome-gemini-cli-subagents](https://github.com/JosephHampton/awesome-gemini-cli-subagents) | CC0 1.0 | agent prompts (Gemini) |
| [YouMind-OpenLab/awesome-gemini-3-prompts](https://github.com/YouMind-OpenLab/awesome-gemini-3-prompts) | CC BY 4.0 | text prompts (Gemini) |
| [danielmiessler/Fabric](https://github.com/danielmiessler/Fabric) | MIT | text prompts (any model) |
| [abilzerian/LLM-Prompt-Library](https://github.com/abilzerian/LLM-Prompt-Library) | MIT | text prompts (any model) |
| [anthropics/skills](https://github.com/anthropics/skills) | per skill | links only |

The Skills page also links to community skill repositories; only their names, descriptions and licenses are shown.

### How content is handled

- Sample images and video clips are loaded from the original collections' servers. This repository and the site store no copies of them.
- Prompt text is unchanged. Some titles are shortened and categories regrouped.
- A video prompt is listed only when it has both a playable clip and its prompt.
- The import applies a keyword filter (`BLOCK` in `scripts/import.mjs`) to keep the site family-friendly. It is deliberately strict and reads prompt text only, not images.
- Titles for the jau123 collection are derived from the first line of each prompt.

## Tests

`npm test` checks the data (unique slugs, required fields, valid redirects) and calls every MCP tool through the real handler. GitHub Actions runs the tests and a full build on every push and pull request.

## Copy counter

The "prompts copied" numbers come from two Supabase database functions, `mt_copy_bump` and `mt_copy_get`, called from the browser with a publishable key (`src/lib/counter.ts`). The key is meant to be public. To run your own copy of the site, point `COUNTER` at your own project or remove the counter; the rest of the site does not depend on it.

## Content removal

If you own a prompt or image shown on the site and want it removed, see https://fillprompt.com/credits#removal or open a [content removal issue](../../issues/new?template=content-removal.yml).

## Contributing

Bug reports, fixes and suggestions for new open-source prompt collections are welcome. Start with an issue labelled [`good first issue`](https://github.com/haritel97/fillprompt/labels/good%20first%20issue) or the [roadmap](https://github.com/haritel97/fillprompt/discussions/8), and see [CONTRIBUTING.md](CONTRIBUTING.md). Everyone taking part is expected to follow the [code of conduct](CODE_OF_CONDUCT.md). To report a security problem privately, see [SECURITY.md](SECURITY.md).

### Contributors

<a href="https://github.com/haritel97/fillprompt/graphs/contributors"><img src="https://contrib.rocks/image?repo=haritel97/fillprompt" alt="Contributors to fillprompt"></a>

## Support

fillprompt.com is free and run by one person. If it saves you time, you can support it on [Ko-fi](https://ko-fi.com/mwrazzuwan) or through the [donate page](https://fillprompt.com/donate). Support never changes which prompts are shown or how they are ranked.

## License

The source code is released under the [MIT License](LICENSE). The prompt data in `src/data/` keeps the license of the collection it came from (see [Content sources](#content-sources)). The fillprompt name, logo and brand files are not licensed for reuse.
