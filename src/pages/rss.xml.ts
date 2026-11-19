// RSS feed: prompt of the day plus the latest popular image prompts.
import { images } from '../lib/data';
import { packs } from '../lib/packs';
import { promptOfTheDay, todayKey } from '../lib/daily';
import { SITE } from '../lib/seo';
import { excerpt } from '../lib/data';

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function GET() {
  const daily = promptOfTheDay();
  const day = todayKey();
  const popular = [...images].sort((a, b) => b.likes - a.likes).slice(0, 12);
  const items = [
    {
      title: `Prompt of the day · ${daily.title}`,
      link: `${SITE}/prompt/${daily.slug}`,
      desc: excerpt(daily.desc || daily.prompt, 280),
      date: day,
    },
    ...packs.slice(0, 6).map((p) => ({
      title: `Pack · ${p.title}`,
      link: `${SITE}/packs/${p.slug}`,
      desc: p.blurb,
      date: day,
    })),
    ...popular.map((p) => ({
      title: p.title,
      link: `${SITE}/prompt/${p.slug}`,
      desc: excerpt(p.desc || p.prompt, 220),
      date: /^\d{4}-\d{2}-\d{2}/.test(p.date || '') ? p.date.slice(0, 10) : day,
    })),
  ];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>fillprompt.com</title>
<link>${SITE}</link>
<description>Free ready-to-copy AI prompts: prompt of the day, curated packs and popular image prompts.</description>
<language>en</language>
${items
  .map(
    (i) => `<item>
<title>${xml(i.title)}</title>
<link>${i.link}</link>
<guid isPermaLink="true">${i.link}</guid>
<pubDate>${new Date(i.date + 'T12:00:00Z').toUTCString()}</pubDate>
<description>${xml(i.desc)}</description>
</item>`,
  )
  .join('\n')}
</channel>
</rss>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
