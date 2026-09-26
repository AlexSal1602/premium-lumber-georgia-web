import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { cache } from 'react';
import { db } from '@/lib/db';
import { readProducts } from '@/lib/catalog/repository';
// generateMetadata and the page render share this request-level database read.
const getProduct = cache(async (id: string) => (await readProducts(db, [id]))[0]);
import { locales, type Locale } from '@/lib/site';
import { ProductDetail } from '@/components/catalog/product-detail';

type Props = { params: Promise<{ locale: string; id: string }>; searchParams: Promise<{ variant?: string | string[] }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params; const product = await getProduct(id);
  if (!product || !locales.includes(locale as Locale)) return {};
  return { title: `${product.name[locale as Locale]} | PREMIUM LUMBER GEORGIA`, description: product.shortDescription[locale as Locale] };
}
export default async function DetailPage({ params, searchParams }: Props) {
  const { locale, id } = await params; const product = await getProduct(id); const query = await searchParams;
  if (!product || !locales.includes(locale as Locale)) notFound();
  return <ProductDetail key={`${product.id}:${typeof query.variant === 'string' ? query.variant : ''}`} product={product} locale={locale as Locale} initialVariant={typeof query.variant === 'string' ? query.variant : undefined}/>;
}
