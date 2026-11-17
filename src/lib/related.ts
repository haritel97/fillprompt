// Rank related prompts for detail pages.
// Candidates are narrowed first (shared category / type / model) so static builds stay fast.

type Scored<T> = { score: number; item: T };

function topN<T>(scored: Scored<T>[], n: number): T[] {
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n).map((s) => s.item);
}

export function relatedImages<T extends { slug: string; model: string; cats: string[]; likes: number }>(
  current: T,
  pool: T[],
  n = 4,
): T[] {
  const catSet = new Set(current.cats);
  const scored: Scored<T>[] = [];
  for (const x of pool) {
    if (x.slug === current.slug) continue;
    let shared = 0;
    for (const c of x.cats) if (catSet.has(c)) shared++;
    if (!shared) continue;
    let score = shared * 5;
    if (x.model === current.model) score += 3;
    score += Math.log10(1 + (x.likes || 0)) / 2;
    scored.push({ score, item: x });
  }
  return topN(scored, n);
}

export function relatedVideos<T extends { slug: string; model: string; cats?: string[]; likes: number }>(
  current: T,
  pool: T[],
  n = 4,
): T[] {
  const cats = new Set(current.cats || []);
  const scored: Scored<T>[] = [];
  for (const x of pool) {
    if (x.slug === current.slug) continue;
    let score = 0;
    for (const c of x.cats || []) if (cats.has(c)) score += 5;
    if (x.model === current.model) score += 4;
    if (!score) continue;
    score += Math.log10(1 + (x.likes || 0)) / 2;
    scored.push({ score, item: x });
  }
  const picked = topN(scored, n);
  if (picked.length >= n) return picked;
  const seen = new Set(picked.map((p) => p.slug));
  for (const x of pool) {
    if (x.slug === current.slug || seen.has(x.slug)) continue;
    if (x.model === current.model) {
      picked.push(x);
      seen.add(x.slug);
      if (picked.length >= n) break;
    }
  }
  return picked;
}

export function relatedTexts<T extends { slug: string; model: string; type: string; forDevs: boolean }>(
  current: T,
  pool: T[],
  n = 6,
): T[] {
  const scored: Scored<T>[] = [];
  for (const x of pool) {
    if (x.slug === current.slug) continue;
    let score = 0;
    if (x.type === current.type) score += 5;
    if (x.model === current.model) score += 3;
    if (x.forDevs === current.forDevs) score += 1;
    if (!score) continue;
    scored.push({ score, item: x });
  }
  return topN(scored, n);
}
