import { notFound } from 'next/navigation';
import { StoredSuccess } from '@/components/checkout/success';
import { locales, type Locale } from '@/lib/site';
export const metadata = { robots: { index: false, follow: false } };
export default async function SuccessPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); return <StoredSuccess locale={locale as Locale}/>; }
