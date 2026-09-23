import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { locales, type Locale } from '@/lib/site';
import type { Localized } from '@/lib/catalog/types';
export default async function NewsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); const l = locale as Locale;
  const posts = await db.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
  return <main id="main" className="container news-page"><p className="eyebrow">GEORGIA WOODS</p><h1>{{ ka: 'ბლოგი და სიახლეები', en: 'News & stories', ru: 'Новости и статьи' }[l]}</h1>{!posts.length && <p>{{ ka: 'სიახლეები მალე დაემატება.', en: 'Stories will be published soon.', ru: 'Скоро здесь появятся новости.' }[l]}</p>}<div className="news-grid">{posts.map(p => <article key={p.id}>{p.image && <Link href={`/${l}/news/${p.slug}`}><img src={p.image} alt={(p.title as Localized)[l]}/></Link>}<p><time dateTime={p.createdAt.toISOString()}>{p.createdAt.toLocaleDateString(l)}</time></p><h2><Link href={`/${l}/news/${p.slug}`}>{(p.title as Localized)[l]}</Link></h2><p>{(p.excerpt as Localized)[l]}</p></article>)}</div></main>;
}
