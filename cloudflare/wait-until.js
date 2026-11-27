// Stands in for @vercel/functions on Cloudflare (alias in wrangler.jsonc): api/_usage.js counts a tool
// call after the response, and the Worker keeps that request alive until it is sent.
export { waitUntil } from 'cloudflare:workers';
