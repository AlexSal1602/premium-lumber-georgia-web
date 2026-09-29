import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { locales, type Locale } from '@/lib/site';
import { localized } from '@/lib/localized';
import { direction, formatDate } from '@/lib/locales';
import { dictionaries } from '@/lib/site';
import type { Metadata } from 'next';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params; if (!locales.includes(locale as Locale)) return {};
  const post = await db.post.findUnique({ where: { slug, published: true } });
  return post ? { title: `${localized(post.title)[locale as Locale]} | PREMIUM LUMBER GEORGIA`, description: localized(post.excerpt)[locale as Locale] } : {};
}
export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params; if (!locales.includes(locale as Locale)) notFound(); const l = locale as Locale;
  const post = await db.post.findUnique({ where: { slug, published: true } }); if (!post) notFound();
  return <main id="main" className="container news-page news-article"><Link className="news-back" href={`/${l}/news`}>{direction(l) === 'rtl' ? '→' : '←'} {dictionaries[l].nav[4]}</Link><h1>{localized(post.title)[l]}</h1><time dateTime={post.createdAt.toISOString()}>{formatDate(post.createdAt, l)}</time>{post.image && <img src={post.image} alt={localized(post.title)[l]}/>}<p className="subheading">{localized(post.excerpt)[l]}</p><div className="news-body">{localized(post.body)[l]}</div></main>;
}
