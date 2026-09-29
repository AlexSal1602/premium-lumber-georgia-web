import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Locale } from '@/lib/site';

export type NewsCardPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string | null;
  date: string;
};

export function NewsCard({ post, locale, readMore }: { post: NewsCardPost; locale: Locale; readMore: string }) {
  const href = `/${locale}/news/${post.slug}`;

  return <article className="news-card">
    <Link className="news-card-image" href={href} aria-label={`${readMore}: ${post.title}`}>
      {post.image
        ? <img src={post.image} alt={post.title} loading="lazy" />
        : <span className="news-card-placeholder" aria-hidden="true" />}
    </Link>
    <div className="news-card-content">
      <time>{post.date}</time>
      <h2><Link href={href}>{post.title}</Link></h2>
      <p>{post.excerpt}</p>
      <Link className="news-card-more" href={href}>{readMore}<ArrowRight size={15}/></Link>
    </div>
  </article>;
}
