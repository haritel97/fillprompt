// fillprompt MCP server: lets Claude, Cursor and other MCP clients search and fetch the prompts on
// fillprompt.com. Stateless Streamable HTTP at https://fillprompt.com/api/mcp, read-only, no sign-in.
import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';
import { search, find, random, slots, credit, summary, filters, KINDS, SITE } from './_catalog.js';
import { recordUsage } from './_usage.js';

const json = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data, null, 2) }], structuredContent: data });
const readOnly = { readOnlyHint: true, openWorldHint: false };

/** The full form of one prompt, as get_prompt and random_prompt return it. */
const full = (x) => ({
  title: x.title,
  type: x.kind,
  model: x.model,
  tags: x.tags,
  url: x.url,
  ...(x.desc ? { description: x.desc } : {}),
  prompt: x.prompt,
  slots: slots(x.prompt),
  media: x.media,
  credit: credit(x),
});

const mcp = createMcpHandler(
  (server) => {
    server.registerTool(
      'search_prompts',
      {
        title: 'Search prompts',
        description:
          'Search over 6,700 free, ready-to-copy AI prompts on fillprompt.com: image prompts (GPT Image, Nano Banana, Midjourney and more), video prompts (Seedance, Veo, Kling and more) and text prompts (system prompts, agent prompts, roles). Returns titles, page URLs and short previews; call get_prompt for the full text.',
        inputSchema: z.object({
          query: z.string().describe('What the prompt should make, in plain words, e.g. "coffee product photo on marble" or "code review agent".'),
          type: z.enum(KINDS).optional().describe('Only image, video or text prompts.'),
          model: z.string().optional().describe('Only prompts written for this AI model, e.g. "Nano Banana", "Seedance", "Claude". See list_filters.'),
          category: z.string().optional().describe('Image category (e.g. "product-brand", "poster") or text prompt type (e.g. "agent", "developer"). See list_filters.'),
          limit: z.number().int().min(1).max(20).default(8).describe('How many results to return.'),
        }),
        annotations: readOnly,
      },
      async (args) => {
        const { total, results } = search(args);
        recordUsage('search_prompts', args.type, total === 0);
        return json({ total, results: results.map(summary) });
      },
    );

    server.registerTool(
      'get_prompt',
      {
        title: 'Get prompt',
        description:
          'Get the full text of one fillprompt.com prompt by its page URL or slug, with its fill-in slots, sample images or video, and credit to the original author. Fill the slots with the user\'s details before using the prompt, and keep the credit when you share it.',
        inputSchema: z.object({
          ref: z.string().describe('The prompt page URL from search_prompts (e.g. https://fillprompt.com/prompt/...) or its slug.'),
          type: z.enum(KINDS).optional().describe('Helps when a bare slug is given.'),
        }),
        annotations: readOnly,
      },
      async ({ ref, type }) => {
        const x = find(ref, type);
        recordUsage('get_prompt', x?.kind);
        if (!x) return { isError: true, content: [{ type: 'text', text: `No prompt found for "${ref}". Use search_prompts to find one.` }] };
        return json(full(x));
      },
    );

    server.registerTool(
      'random_prompt',
      {
        title: 'Random prompt',
        description:
          'Get one fillprompt.com prompt picked at random, in full (the same shape as get_prompt), for requests like "surprise me" or "give me an idea for a poster" that have no search query. Narrow it with type, model or category.',
        inputSchema: z.object({
          type: z.enum(KINDS).optional().describe('Only image, video or text prompts.'),
          model: z.string().optional().describe('Only prompts written for this AI model, e.g. "Nano Banana", "Seedance", "Claude". See list_filters.'),
          category: z.string().optional().describe('Image category (e.g. "poster") or text prompt type (e.g. "agent"). See list_filters.'),
        }),
        annotations: readOnly,
      },
      async (args) => {
        const x = random(args);
        recordUsage('random_prompt', x?.kind ?? args.type, !x);
        if (!x) return { isError: true, content: [{ type: 'text', text: 'No prompt matches these filters. Use list_filters to see the valid values.' }] };
        return json(full(x));
      },
    );

    server.registerTool(
      'list_filters',
      {
        title: 'List filters',
        description: 'List the image categories, text prompt types and AI models on fillprompt.com, with how many prompts each has. Use the values with search_prompts.',
        inputSchema: z.object({}),
        annotations: readOnly,
      },
      async () => {
        recordUsage('list_filters');
        return json(filters());
      },
    );
  },
  {
    serverInfo: { name: 'fillprompt', version: '1.0.0', title: 'fillprompt.com prompts', websiteUrl: SITE },
    instructions:
      'fillprompt.com is a free library of AI prompts for images, video and text. Use search_prompts to find candidates (or random_prompt for an idea when there is no query), get_prompt to read one in full, then fill its slots with the user\'s details. Link the prompt page and credit the author when you share a prompt.',
  },
);

// Browser-based clients (such as the MCP Inspector) need CORS.
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version',
};

async function handle(request) {
  // A person opening the URL in a browser gets the setup page instead of a protocol error.
  if (request.method === 'GET' && (request.headers.get('accept') || '').includes('text/html')) {
    return Response.redirect(SITE + '/mcp', 302);
  }
  const res = await mcp(request);
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;
export const OPTIONS = () => new Response(null, { status: 204, headers: CORS });
