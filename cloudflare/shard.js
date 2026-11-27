// Which of the SHARDS files holds a prompt's full record (cloudflare/build.mjs writes them, the Worker reads
// them). Small files keep the Worker well under its memory limit: it only parses the shard it needs.
export const SHARDS = 64;

export function shard(slug) {
  let h = 0x811c9dc5;
  for (let i = 0; i < slug.length; i++) h = Math.imul(h ^ slug.charCodeAt(i), 0x01000193);
  return String((h >>> 0) % SHARDS).padStart(2, '0');
}
