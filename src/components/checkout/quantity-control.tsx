'use client';

import { useEffect, useId, useState } from 'react';
import { Check } from 'lucide-react';
import type { Locale } from '@/lib/site';
import type { CartLine } from '@/lib/catalog/types';
import { catalogText, unitLabels } from '@/lib/catalog/i18n';
import { checkoutText } from '@/lib/checkout/i18n';
import { cartKey, validQuantity } from '@/lib/catalog/logic';
import { useCart } from '../catalog/cart-provider';

export function QuantityControl({ line, locale, onValidityChange }: { line: CartLine; locale: Locale; onValidityChange?: (invalid: boolean) => void }) {
  const cart = useCart(); const [draft, setDraft] = useState(String(line.quantity)); const [error, setError] = useState(false);
  const id = useId(); const t = catalogText[locale]; const c = checkoutText[locale];
  useEffect(() => { setDraft(String(line.quantity)); setError(false); }, [line.quantity]);
  function save() {
    const value = Number(draft);
    if (!validQuantity(value, line.unit) || !cart.updateQuantity(cartKey(line), value)) { setError(true); onValidityChange?.(true); return; }
    setError(false); onValidityChange?.(false);
  }
  return <div className="quantity-editor"><label htmlFor={id}>{t.quantity} ({unitLabels[line.unit][locale]})</label><div><input id={id} type="number" value={draft} min={line.unit === 'piece' ? 1 : .001} max={10000} step={line.unit === 'piece' ? 1 : .001} inputMode={line.unit === 'piece' ? 'numeric' : 'decimal'} onChange={event => { setDraft(event.target.value); onValidityChange?.(!validQuantity(Number(event.target.value), line.unit)); }} onBlur={save} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); save(); } }} aria-invalid={error} aria-describedby={error ? `${id}-error` : undefined}/><button type="button" className="icon-button" aria-label={c.saveQuantity} onClick={save}><Check size={17}/></button></div>{error && <p id={`${id}-error`} role="alert" className="form-error">{t.invalidQuantity}</p>}</div>;
}
