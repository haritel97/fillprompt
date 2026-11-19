/** UTC day number since epoch. */
export const utcDay = (d = new Date()) =>
  Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) / 86_400_000);

export const todayKey = (d = new Date()) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())).toISOString().slice(0, 10);

/** Deterministic prompt of the day from a pool of popular image prompts. */
export function promptOfTheDay(images, d = new Date()) {
  const pool = [...images]
    .filter((p) => p.images?.[0] && (p.likes || 0) > 0)
    .sort((a, b) => b.likes - a.likes || a.slug.localeCompare(b.slug))
    .slice(0, 240);
  if (!pool.length) return images[0];
  return pool[utcDay(d) % pool.length];
}
