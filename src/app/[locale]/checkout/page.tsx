import { notFound } from 'next/navigation';
import { Checkout } from '@/components/checkout/checkout';
import { locales, type Locale } from '@/lib/site';
import { checkoutText } from '@/lib/checkout/i18n';
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; return { title: `${checkoutText[locale as Locale]?.title ?? 'Checkout'} | PREMIUM LUMBER GEORGIA`, robots: { index: false, follow: false } }; }
export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; if (!locales.includes(locale as Locale)) notFound(); return <Checkout locale={locale as Locale}/>; }
