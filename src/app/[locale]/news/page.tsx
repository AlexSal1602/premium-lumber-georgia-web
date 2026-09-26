import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { locales, type Locale } from '@/lib/site';
import { localized } from '@/lib/localized';
import { formatDate } from '@/lib/locales';
import { commonText } from '@/lib/translations/common';
export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); const l = locale as Locale;
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
  return <main id="main" className="container news-page"><p className="eyebrow">GEORGIA WOODS</p><h1>{commonText[l].newsTitle}</h1>{!posts.length && <p>{commonText[l].newsEmpty}</p>}<div className="news-grid">{posts.map(p => <article key={p.id}>{p.image && <Link href={`/${l}/news/${p.slug}`}><img src={p.image} alt={localized(p.title)[l]}/></Link>}<p><time dateTime={p.createdAt.toISOString()}>{formatDate(p.createdAt, l)}</time></p><h2><Link href={`/${l}/news/${p.slug}`}>{localized(p.title)[l]}</Link></h2><p>{localized(p.excerpt)[l]}</p></article>)}</div></main>;
}
