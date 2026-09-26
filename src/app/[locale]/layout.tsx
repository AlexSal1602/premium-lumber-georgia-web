import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/lib/site';
import { Suspense } from 'react';
import { CartProvider } from '@/components/catalog/cart-provider';
import { SiteHeader } from '@/components/site-header';
import { dictionaries } from '@/lib/site';
import { db } from '@/lib/db';
import { readProducts } from '@/lib/catalog/repository';
import { localized } from '@/lib/localized';
import { categoryLabels } from '@/lib/catalog/i18n';
export function generateStaticParams() { return locales.map(locale => ({ locale })); }
export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
 const { locale } = await params;
 if (!locales.includes(locale as Locale)) notFound();
 const [products, rows] = await Promise.all([readProducts(db), db.category.findMany({ orderBy: { id: 'asc' } })]);
 const categories = rows.map(c => ({ id: c.id, name: localized(c.name, categoryLabels[c.id]) }));
 return <CartProvider locale={locale as Locale} products={products} categories={categories}><a href="#main" className="skip-link">{dictionaries[locale as Locale].skip}</a><Suspense fallback={<div className="header-placeholder"/>}><SiteHeader locale={locale as Locale}/></Suspense>{children}</CartProvider>;
}
