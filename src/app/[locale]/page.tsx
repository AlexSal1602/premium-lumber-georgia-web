import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dictionaries, locales, site, type Locale } from '@/lib/site';
import { Landing } from '@/components/landing';
import { db } from '@/lib/db';
import { localized } from '@/lib/localized';
import { formatDate } from '@/lib/locales';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const d = dictionaries[locale as Locale]; return { title: `${site.name} | ${d?.subtitle ?? 'Timber'}`, description: d?.intro }; }
export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 if (!locales.includes(locale as Locale)) notFound();
 const l = locale as Locale;
 const posts = await db.post.findMany({
  where: { published: true },
  orderBy: { createdAt: 'desc' },
  take: 3,
  select: { id: true, slug: true, title: true, excerpt: true, image: true, createdAt: true },
 });
 const latestPosts = posts.map(post => ({
  id: post.id,
  slug: post.slug,
  title: localized(post.title)[l],
  excerpt: localized(post.excerpt)[l],
  image: post.image,
  date: formatDate(post.createdAt, l),
 }));
 return <Landing locale={l} d={dictionaries[l]} latestPosts={latestPosts} />;
}
