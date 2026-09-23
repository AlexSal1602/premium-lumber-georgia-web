'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Check, ArrowUpRight } from 'lucide-react';
import type { Locale } from '@/lib/site';
import { money } from '@/lib/catalog/i18n';
import { checkoutText } from '@/lib/checkout/i18n';
import { receiptSchema, type OrderReceipt } from '@/lib/checkout/schema';

export const receiptStorageKey = 'georgia-woods-order-receipt';
export function SuccessScreen({ receipt, locale }: { receipt: OrderReceipt; locale: Locale }) {
  const t = checkoutText[locale];
  return <main id="main" className="checkout-success container"><div className="success-icon"><Check size={38}/></div><p className="eyebrow">GEORGIA WOODS</p><h1 tabIndex={-1} ref={node => node?.focus()}>{t.successTitle}</h1><p>{t.successText}</p><div className="receipt-box"><span>{t.orderNumber}</span><strong>#{receipt.orderNumber}</strong><dl><div><dt>{t.status}</dt><dd className="receipt-status">{t.newStatus}</dd></div><div><dt>{t.estimate}</dt><dd>{money(receipt.totalCents / 100, locale)}</dd></div></dl></div><p className="fine-print">{t.noCharge}</p><Link href={`/${locale}/catalog`} className="primary-button">{t.back}<ArrowUpRight size={17}/></Link></main>;
}
export function StoredSuccess({ locale }: { locale: Locale }) {
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null); const [ready, setReady] = useState(false); const t = checkoutText[locale];
  useEffect(() => { try { const parsed = receiptSchema.safeParse(JSON.parse(sessionStorage.getItem(receiptStorageKey) ?? 'null')); if (parsed.success) setReceipt(parsed.data); } catch { /* No receipt in this browser session. */ } setReady(true); }, []);
  if (!ready) return <main id="main" className="container checkout-empty" aria-busy="true">{t.loading}</main>;
  if (!receipt) return <main id="main" className="container checkout-empty"><p>{t.empty}</p><Link className="primary-button" href={`/${locale}/catalog`}>{t.back}</Link></main>;
  return <SuccessScreen receipt={receipt} locale={locale}/>;
}
