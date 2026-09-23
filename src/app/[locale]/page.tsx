import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dictionaries, locales, site, type Locale } from '@/lib/site';
import { Landing } from '@/components/landing';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const d = dictionaries[locale as Locale]; return { title: `${site.name} | ${d?.subtitle ?? 'Timber'}`, description: d?.intro }; }
export default async function Page({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); return <Landing locale={locale as Locale} d={dictionaries[locale as Locale]} />; }
