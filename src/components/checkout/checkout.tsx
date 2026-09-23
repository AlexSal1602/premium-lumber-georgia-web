'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowRight, ShoppingBag, Truck, Phone, Trash2, Check } from 'lucide-react';
import type { Locale } from '@/lib/site';
import { checkoutText } from '@/lib/checkout/i18n';
import { customerSchema, receiptSchema, type CustomerInput, type OrderReceipt } from '@/lib/checkout/schema';
import { catalogText, money, unitLabels } from '@/lib/catalog/i18n';
import { cartKey, dimensionText, lineTotal } from '@/lib/catalog/logic';
import { useCart } from '../catalog/cart-provider';
import { QuantityControl } from './quantity-control';
import { receiptStorageKey, SuccessScreen } from './success';

const attemptKey = 'georgia-woods-order-attempt';
async function requestIdentity(payload: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}
export function Checkout({ locale }: { locale: Locale }) {
  const t = checkoutText[locale]; const labels = catalogText[locale]; const cart = useCart(); const router = useRouter();
  const [invalidQuantities, setInvalidQuantities] = useState<Record<string, boolean>>({});
  const [error, setError] = useState(''); const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const submitting = useRef(false); const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<CustomerInput>({ resolver: zodResolver(customerSchema(locale)), defaultValues: { fullName: '', phone: '', email: '', city: '', address: '', deliveryMethod: 'pickup', comment: '' } });
  const delivery = watch('deliveryMethod');
  async function submit(customer: CustomerInput) {
    if (submitting.current) return;
    submitting.current = true; setError('');
    const items = cart.snapshot().map(({ productId, variantId, unit, quantity }) => ({ productId, variantId, unit, quantity })).sort((a,b) => cartKey(a).localeCompare(cartKey(b)));
    if (!items.length || items.some(line => invalidQuantities[cartKey(line)])) { submitting.current = false; setError(t.invalidCart); return; }
    try {
      const fingerprint = await requestIdentity(JSON.stringify({ locale, customer, items }));
      if (!attempt.current) { try { const stored = JSON.parse(sessionStorage.getItem(attemptKey) ?? 'null'); if (stored && typeof stored.fingerprint === 'string' && typeof stored.key === 'string') attempt.current = stored; } catch { /* Memory fallback still handles retries. */ } }
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      try { sessionStorage.setItem(attemptKey, JSON.stringify(attempt.current)); } catch { /* Keep the key in memory. */ }
      const response = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale, customer, items, idempotencyKey: attempt.current.key }), signal: AbortSignal.timeout(20000) });
      const body = await response.json();
      if (!response.ok) { setError(body.code === 'INVALID_CART' ? t.invalidCart : body.code === 'IDEMPOTENCY_CONFLICT' ? t.conflict : t.retry); return; }
      const result = receiptSchema.safeParse(body);
      if (!result.success) { setError(t.retry); return; }
      // A receipt means the database transaction committed. Only now consume the submitted lines.
      cart.consume(items); setReceipt(result.data);
      try { sessionStorage.setItem(receiptStorageKey, JSON.stringify(result.data)); sessionStorage.removeItem(attemptKey); router.replace(`/${locale}/checkout/success`); } catch { /* Render success here if storage is unavailable. */ }
    } catch { setError(t.retry); }
    finally { submitting.current = false; }
  }
  if (receipt) return <SuccessScreen receipt={receipt} locale={locale}/>;
  if (!cart.ready) return <main id="main" className="container checkout-empty" aria-busy="true">{t.loading}</main>;
  if (!cart.lines.length) return <main id="main" className="container checkout-empty"><ShoppingBag size={40}/><h1>{t.title}</h1><p>{t.empty}</p><Link href={`/${locale}/catalog`} className="primary-button">{t.back}</Link></main>;
  const field = (key: 'fullName' | 'phone' | 'email' | 'city' | 'address', required: boolean, autoComplete: string, type = 'text') => <label className={`form-field checkout-field field-${key}`}>{t[key]} {required ? '*' : `(${t.optional})`}<input {...register(key)} type={type} autoComplete={autoComplete} aria-required={required} aria-invalid={!!errors[key]} aria-describedby={errors[key] ? `error-${key}` : undefined}/>{errors[key] && <span id={`error-${key}`} className="form-error" role="alert">{errors[key]?.message}</span>}</label>;
  return <main id="main" className="container checkout-page"><nav className="breadcrumbs" aria-label={t.title}><Link href={`/${locale}`}>{labels.home}</Link><span>/</span><Link href={`/${locale}/catalog`}>{labels.catalog}</Link><span>/</span><span>{t.title}</span></nav><div className="checkout-heading"><div><p className="eyebrow">GEORGIA WOODS / ORDER</p><h1>{t.title}</h1><p>{t.subtitle}</p></div><span className="paymentless-badge"><Check size={16}/>{t.noPayment}</span></div><p className="demo-note">{labels.demo}</p>
    <div className="checkout-grid"><form className="checkout-form" id="checkout-form" onSubmit={handleSubmit(submit)} noValidate><fieldset disabled={isSubmitting}><legend className="sr-only">{t.contact}</legend><section><h2><Phone size={20}/>{t.contact}</h2><div className="checkout-fields">{field('fullName', true, 'name')}{field('phone', true, 'tel', 'tel')}{field('email', false, 'email', 'email')}</div></section><section><h2><Truck size={21}/>{t.delivery}</h2><label className="form-field checkout-field">{t.deliveryMethod}<select {...register('deliveryMethod')} aria-invalid={!!errors.deliveryMethod} aria-describedby={errors.deliveryMethod ? 'error-delivery' : undefined}>{(['pickup', 'transport', 'other'] as const).map(method => <option key={method} value={method}>{t[method]}</option>)}</select>{errors.deliveryMethod && <span id="error-delivery" role="alert" className="form-error">{errors.deliveryMethod.message}</span>}</label><div className="checkout-fields">{field('city', delivery !== 'pickup', 'address-level2')}{field('address', delivery !== 'pickup', 'street-address')}</div><label className="form-field checkout-field">{t.comment} ({t.optional})<textarea {...register('comment')} rows={5} placeholder={t.commentHint} maxLength={2000} aria-invalid={!!errors.comment} aria-describedby={errors.comment ? 'error-comment' : undefined}/>{errors.comment && <span id="error-comment" role="alert" className="form-error">{errors.comment.message}</span>}</label></section></fieldset>
      {error && <div role="alert" className="checkout-error"><strong>{t.errorTitle}</strong><p>{error}</p></div>}
    </form>
    <aside className="checkout-summary" aria-label={t.summary}><h2>{t.summary}<span>{cart.lines.length}</span></h2><fieldset disabled={isSubmitting}><legend className="sr-only">{t.editCart}</legend><ul className="checkout-items">{cart.lines.map(line => { const product = cart.getProduct(line.productId)!; const variant = product.variants.find(v => v.id === line.variantId)!; return <li key={cartKey(line)}><img src={product.images[0].src} alt=""/><div><Link href={`/${locale}/catalog/${product.id}?variant=${variant.id}`}>{product.name[locale]}</Link><p>{dimensionText(variant)} {labels.mm}</p><p>{variant.status === 'available' ? labels.available : labels.onOrder}</p><QuantityControl line={line} locale={locale} onValidityChange={invalid => setInvalidQuantities(previous => ({ ...previous, [cartKey(line)]: invalid }))}/><p>{line.quantity} {unitLabels[line.unit][locale]} · <strong>{money(lineTotal(variant, line.unit, line.quantity), locale)}</strong></p></div><button type="button" className="icon-button" aria-label={`${labels.remove}: ${product.name[locale]}`} onClick={() => cart.remove(cartKey(line))}><Trash2 size={15}/></button></li>; })}</ul></fieldset><div className="checkout-total"><span>{t.estimate}</span><strong>{money(cart.total, locale)}</strong></div><p className="fine-print">{t.estimateNote}</p><button className="primary-button submit-order" type="submit" form="checkout-form" disabled={isSubmitting || !cart.lines.length || cart.lines.some(line => invalidQuantities[cartKey(line)])}>{isSubmitting ? t.submitting : t.submit}<ArrowRight size={18}/></button><p className="fine-print no-payment-note">{t.noCharge}</p></aside></div>
  </main>;
}
