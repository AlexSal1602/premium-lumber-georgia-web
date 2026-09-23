import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Catalog } from '@/components/catalog/catalog';
import { locales, type Locale } from '@/lib/site';
import { catalogText } from '@/lib/catalog/i18n';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const t = catalogText[locale as Locale];
  return { title: `${t?.catalog ?? 'Catalog'} | GEORGIA WOODS`, description: t?.subtitle };
}
export default async function CatalogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!locales.includes(locale as Locale)) notFound();
  return <Suspense fallback={<main id="main" className="container catalog-loading">{catalogText[locale as Locale].catalog}…</main>}><Catalog locale={locale as Locale}/></Suspense>;
}
