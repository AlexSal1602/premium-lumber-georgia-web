import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { dictionaries, locales, type Locale } from '@/lib/site';
import { localized } from '@/lib/localized';
import { formatDate } from '@/lib/locales';
import { commonText } from '@/lib/translations/common';
import { NewsCard } from '@/components/news-card';
export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); const l = locale as Locale;
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
  const cards = posts.map(p => ({ id: p.id, slug: p.slug, title: localized(p.title)[l], excerpt: localized(p.excerpt)[l], image: p.image, date: formatDate(p.createdAt, l) }));
  return <main id="main" className="news-page"><div className="container"><div className="news-page-heading"><p className="eyebrow">PREMIUM LUMBER GEORGIA</p><h1>{commonText[l].newsTitle}</h1></div>{!posts.length && <p className="news-empty">{commonText[l].newsEmpty}</p>}<div className="news-grid">{cards.map(post => <NewsCard key={post.id} post={post} locale={l} readMore={dictionaries[l].more}/>)}</div></div></main>;
}
