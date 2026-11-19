// Curated prompt packs: hand-picked themes that cut across categories and kinds.
import { images, texts, videos } from './data';
import { PACK_DEFS, buildPacks } from './pack-build.mjs';

export type PackKind = 'image' | 'video' | 'text';
export type PackDef = (typeof PACK_DEFS)[number];
export type PackItem = ReturnType<typeof buildPacks>[number]['items'][number];
export type Pack = ReturnType<typeof buildPacks>[number];

export const packs: Pack[] = buildPacks({ images, videos, texts, defs: PACK_DEFS });
export const packBySlug = (slug: string) => packs.find((p) => p.slug === slug);
