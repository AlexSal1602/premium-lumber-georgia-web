'use client';

import Link from 'next/link';
import { ArrowDown, ArrowUpRight, ArrowRight, TreePine, Users, Factory, Globe2, Sprout, SlidersHorizontal, Mail, MapPin } from 'lucide-react';
import { site, photos, type Locale, type Dictionary } from '@/lib/site';
import { commonText } from '@/lib/translations/common';
import { useCart } from './catalog/cart-provider';
import { categoryLabels } from '@/lib/catalog/i18n';
import { BrandLogo } from './brand-logo';
import { NewsCard, type NewsCardPost } from './news-card';

const anchors = ['about', 'production', 'partnership', 'manufacturing', 'news', 'contacts'];
const icons = [Users, Factory, Globe2, TreePine, Sprout, SlidersHorizontal];
export function Landing({ locale, d, latestPosts }: { locale: Locale; d: Dictionary; latestPosts: NewsCardPost[] }) {
 const c = commonText[locale];
 const { products } = useCart(); const featuredProducts = products.slice(0, 6);
 return <>
 <main id="main">
 <section className="hero" aria-labelledby="hero-title"><img src={photos.forest} alt="" className="hero-photo" fetchPriority="high"/><div className="hero-shade"/><div className="hero-content"><span className="hero-kicker"><span/>{d.eyebrow}</span><h1 id="hero-title">PREMIUM<br/><span>LUMBER GEORGIA</span></h1><p>{d.subtitle}</p></div><div className="hero-bottom"><span className="hero-side">{c.nature}</span><a className="scroll-down" href="#about"><span>{d.down}</span><ArrowDown size={21}/></a><span className="hero-side right">41°43′ N &nbsp; 44°47′ E<br/>{c.country}</span></div><span className="hero-index">01 — 03</span></section>
 <section id="about" className="section container"><div className="section-heading"><div><p className="eyebrow">{d.label}</p><h2>{d.title}</h2></div><p className="intro">{d.intro}</p></div><div className="features">{d.features.map(([title, description], i) => { const Icon = icons[i]; return <article className="feature" key={title}><Icon size={34} strokeWidth={1.25}/><h3>{title}</h3><p>{description}</p></article>; })}</div></section>
 <section id="production" className="production section"><div className="container"><div className="section-heading"><div><p className="eyebrow">{d.production}</p><h2>{d.productTitle}</h2><p className="subheading">{d.productIntro}</p></div><Link href={`/${locale}/catalog`} className="text-link">{d.all}<ArrowUpRight size={20}/></Link></div><div id="products" className="products">{featuredProducts.map((product, i) => <article className="product" key={product.id}><Link className="product-image" href={`/${locale}/catalog/${product.id}`} aria-label={`${d.more}: ${product.name[locale]}`}><img src={product.images[0].src} style={{ objectPosition: `${[20, 50, 80, 35, 65, 90][i]}% center`, filter: `brightness(${[1, 1, 1.1, .88, .95, 1.15][i]})` }} alt={product.images[0].alt[locale]} loading="lazy"/><span className="product-number">0{i + 1}</span><span className="image-arrow"><ArrowUpRight size={21}/></span></Link><div className="product-info"><p>{(product.categoryName ?? categoryLabels[product.category])?.[locale] ?? product.category}</p><h3>{product.name[locale]}</h3><Link className="more" href={`/${locale}/catalog/${product.id}`}>{d.more}<ArrowRight size={17}/></Link></div></article>)}</div></div></section>
 <section id="manufacturing" className="manufacturing container"><div className="manufacturing-image"><img src={photos.logs} alt={d.nav[3]} loading="lazy"/><span>{c.forestHome}</span></div><div><p className="eyebrow">03 / {d.nav[3]}</p><h2>{d.manufacturing}</h2><p className="subheading">{d.manufacturingText}</p><a href="#contacts" className="text-link">{d.find}<ArrowUpRight size={20}/></a></div></section>
 <section id="partnership" className="partnership"><div className="container partnership-inner"><div><p className="eyebrow">{d.nav[2]}</p><h2>{d.partnership}</h2><p>{d.partnershipText}</p></div><a href="#contacts" className="round-link" aria-label={d.find}><ArrowUpRight size={32}/></a></div></section>
 <section id="news" className="news container"><div className="news-heading"><div><p className="eyebrow">04 / {d.nav[4]}</p><h2>{d.news}</h2></div><Link href={`/${locale}/news`} className="text-link">{d.nav[4]}<ArrowUpRight size={18}/></Link></div>{latestPosts.length ? <div className="news-grid news-grid-home">{latestPosts.map(post => <NewsCard key={post.id} post={post} locale={locale} readMore={d.more}/>)}</div> : <p className="news-empty">{c.newsEmpty}</p>}</section>
 </main>
 <footer id="contacts"><div className="container"><div className="footer-heading"><div><p className="eyebrow">{d.nav[5]}</p><h2>{d.contact}</h2><p>{d.contactText}</p></div><a href={`mailto:${site.email}`} className="contact-button">{d.find}<ArrowUpRight size={19}/></a></div><div className="footer-grid"><div><BrandLogo href="#top" inverse/><p className="footer-tagline">{d.footer}</p></div><div><h3>{d.links}</h3><div className="footer-links">{d.nav.map((label, i) => <a key={label} href={i === 1 ? `/${locale}/catalog` : i === 4 ? `/${locale}/news` : `#${anchors[i]}`}>{label}</a>)}</div></div><div><h3>{d.find}</h3><a className="contact-line" href={`mailto:${site.email}`}><Mail size={16}/>{site.email}</a><p className="contact-line"><MapPin size={16}/>{c.location}</p><p>{site.phone}</p><small>{d.note}</small></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} {site.name}. {d.rights}</span><span>{c.rooted}</span></div></div></footer>

 </>;
}
