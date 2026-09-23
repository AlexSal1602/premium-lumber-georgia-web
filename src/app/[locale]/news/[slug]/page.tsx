import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { locales, type Locale } from '@/lib/site';
import type { Localized } from '@/lib/catalog/types';
import type { Metadata } from 'next';
type Props = { params: Promise<{ locale: string; slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params; if (!locales.includes(locale as Locale)) return {};
  const post = await db.post.findUnique({ where: { slug, published: true } });
  return post ? { title: `${(post.title as Localized)[locale as Locale]} | Georgia Woods`, description: (post.excerpt as Localized)[locale as Locale] } : {};
}
export default async function PostPage({ params }: Props) {
  const { locale, slug } = await params; if (!locales.includes(locale as Locale)) notFound(); const l = locale as Locale;
  const post = await db.post.findUnique({ where: { slug, published: true } }); if (!post) notFound();
  return <main id="main" className="container news-page news-article"><Link href={`/${l}/news`}>← {{ ka: 'სიახლეები', en: 'News', ru: 'Новости' }[l]}</Link><h1>{(post.title as Localized)[l]}</h1><time dateTime={post.createdAt.toISOString()}>{post.createdAt.toLocaleDateString(l)}</time>{post.image && <img src={post.image} alt={(post.title as Localized)[l]}/>}<p className="subheading">{(post.excerpt as Localized)[l]}</p><div className="news-body">{(post.body as Localized)[l]}</div></main>;
}
