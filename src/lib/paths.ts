// getStaticPaths helpers for list, category, model and source routes.
import {
  images,
  texts,
  videos,
  catSlugs,
  imageModels,
  videoModels,
  textModels,
  TEXT_FILTERS,
  inTextFilter,
  textFilterCounts,
  sourceStats,
  itemsForSource,
} from './data';
import { relatedImages, relatedVideos, relatedTexts } from './related';
import { packsFor } from './packs';

export const IMAGE_PAGE = 48;
export const TEXT_PAGE = 60;
export const VIDEO_PAGE = 36;
export const SOURCE_PAGE = 48;

export const imageListPaths = (paginate: any) => paginate(images, { pageSize: IMAGE_PAGE });

export const categoryPaths = (paginate: any) =>
  catSlugs.flatMap((cat) =>
    paginate(
      images.filter((p) => p.cats.includes(cat)),
      { params: { cat }, pageSize: IMAGE_PAGE },
    ),
  );

export const imageModelPaths = (paginate: any) =>
  imageModels.flatMap((m) =>
    paginate(
      images.filter((p) => p.model === m.label),
      { params: { model: m.slug }, pageSize: IMAGE_PAGE },
    ),
  );

export const imagePromptPaths = () =>
  images.map((p) => ({
    params: { slug: p.slug },
    props: { p, related: relatedImages(p, images), inPacks: packsFor('image', p.slug) },
  }));

export const videoListPaths = (paginate: any) => paginate(videos, { pageSize: VIDEO_PAGE });

export const videoModelPaths = (paginate: any) =>
  videoModels.flatMap((m) =>
    paginate(
      videos.filter((v) => v.model === m.label),
      { params: { model: m.slug }, pageSize: VIDEO_PAGE },
    ),
  );

export const videoPromptPaths = () =>
  videos.map((v) => ({
    params: { slug: v.slug },
    props: { v, related: relatedVideos(v, videos), inPacks: packsFor('video', v.slug) },
  }));

export const textListPaths = (paginate: any) => paginate(texts, { pageSize: TEXT_PAGE });

export const textTypePaths = (paginate: any) =>
  TEXT_FILTERS.filter((f) => textFilterCounts[f]).flatMap((f) =>
    paginate(
      texts.filter((t) => inTextFilter(t, f)),
      { params: { type: f }, pageSize: TEXT_PAGE },
    ),
  );

export const textModelPaths = (paginate: any) =>
  textModels.flatMap((m) =>
    paginate(
      texts.filter((t) => t.model === m.label),
      { params: { model: m.slug }, pageSize: TEXT_PAGE },
    ),
  );

export const textPromptPaths = () =>
  texts.map((t) => ({
    params: { slug: t.slug },
    props: { t, more: relatedTexts(t, texts), inPacks: packsFor('text', t.slug) },
  }));

export const sourceListPaths = (paginate: any) =>
  sourceStats.flatMap((s) =>
    paginate(itemsForSource(s.key), { params: { key: s.key }, pageSize: SOURCE_PAGE }),
  );
