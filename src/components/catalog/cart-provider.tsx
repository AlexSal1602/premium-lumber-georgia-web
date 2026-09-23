'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { X, Trash2, ShoppingBag } from 'lucide-react';
import type { Locale } from '@/lib/site';
import type { Product, Localized } from '@/lib/catalog/types';
import { catalogText, money, unitLabels } from '@/lib/catalog/i18n';
import { cartKey, dimensionText, lineTotal, restoreCart, validQuantity } from '@/lib/catalog/logic';
import type { CartLine } from '@/lib/catalog/types';
import { checkoutText } from '@/lib/checkout/i18n';
import { consumeCart } from '@/lib/checkout/cart';
import { QuantityControl } from '../checkout/quantity-control';

type CartContextValue = {
  products: Product[]; categories: { id: string; name: Localized }[]; getProduct: (id: string) => Product | undefined;
  lines: CartLine[]; ready: boolean; total: number;
  add: (line: CartLine) => boolean; updateQuantity: (key: string, quantity: number) => boolean;
  remove: (key: string) => void; clear: () => void; consume: (ordered: CartLine[]) => void;
  snapshot: () => CartLine[]; open: () => void;
};
const CartContext = createContext<CartContextValue | null>(null);
export function useCart() { const context = useContext(CartContext); if (!context) throw new Error('CartProvider required'); return context; }
const storageKey = 'georgia-woods-cart-v1';

export function CartProvider({ locale, products, categories, children }: { locale: Locale; products: Product[]; categories: { id: string; name: Localized }[]; children: ReactNode }) {
  const getProduct = (id: string) => products.find(p => p.id === id);
  const [storedLines, setLines] = useState<CartLine[]>([]);
  const lines = restoreCart(storedLines, products);
  const current = useRef<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const t = catalogText[locale];
  const c = checkoutText[locale];
  useEffect(() => {
    try { current.current = restoreCart(JSON.parse(localStorage.getItem(storageKey) ?? '[]'), products); setLines(current.current); }
    catch { setStorageError(true); }
    setReady(true);
    const sync = (event: StorageEvent) => {
      if (event.key !== storageKey && event.key !== null) return;
      try { current.current = restoreCart(JSON.parse(event.newValue ?? '[]'), products); setLines(current.current); } catch { /* Keep the current valid cart. */ }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  const commit = useCallback((next: CartLine[]) => {
    current.current = next; setLines(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
  }, []);
  const add = useCallback((line: CartLine) => {
    if (!ready || restoreCart([line], products).length !== 1) return false;
    const existing = current.current.find(entry => cartKey(entry) === cartKey(line));
    const quantity = Math.round(((existing?.quantity ?? 0) + line.quantity) * 1000) / 1000;
    if (!validQuantity(quantity, line.unit)) return false;
    commit(existing ? current.current.map(entry => cartKey(entry) === cartKey(line) ? { ...entry, quantity } : entry) : [...current.current, { ...line }]);
    return true;
  }, [commit, ready, products]);
  const updateQuantity = useCallback((key: string, quantity: number) => {
    const line = current.current.find(item => cartKey(item) === key);
    if (!ready || !line || !validQuantity(quantity, line.unit)) return false;
    commit(current.current.map(item => cartKey(item) === key ? { ...item, quantity } : item));
    return true;
  }, [commit, ready]);
  const remove = useCallback((key: string) => commit(current.current.filter(line => cartKey(line) !== key)), [commit]);
  const clear = useCallback(() => commit([]), [commit]);
  const consume = useCallback((ordered: CartLine[]) => commit(consumeCart(current.current, ordered)), [commit]);
  const total = lines.reduce((sum, line) => { const variant = getProduct(line.productId)!.variants.find(v => v.id === line.variantId)!; return sum + lineTotal(variant, line.unit, line.quantity); }, 0);
  return <CartContext.Provider value={{ products, categories, getProduct, lines, ready, total, add, updateQuantity, remove, clear, consume, snapshot: () => current.current.map(line => ({ ...line })), open: () => dialog.current?.showModal() }}>
    {children}
    <dialog ref={dialog} className="cart-dialog" aria-labelledby="cart-title" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
      <div className="cart-heading"><h2 id="cart-title">{t.cart} <span>({lines.length})</span></h2><button className="icon-button" aria-label={t.close} onClick={() => dialog.current?.close()}><X/></button></div>
      {storageError && <p className="form-warning" role="status">{t.storageError}</p>}
      {!lines.length ? <div className="empty-cart"><ShoppingBag size={40}/><p>{t.emptyCart}</p><Link href={`/${locale}/catalog`} onClick={() => dialog.current?.close()} className="primary-button">{t.continue}</Link></div> : <>
        <ul className="cart-items">{lines.map(line => {
          const product = getProduct(line.productId)!; const variant = product.variants.find(v => v.id === line.variantId)!;
          return <li key={cartKey(line)}><img src={product.images[0].src} alt=""/><div><Link href={`/${locale}/catalog/${product.id}?variant=${variant.id}`} onClick={() => dialog.current?.close()}>{product.name[locale]}</Link><p>{dimensionText(variant)} {t.mm}</p><p>{unitLabels[line.unit][locale]} · {variant.status === 'available' ? t.available : t.onOrder}</p><QuantityControl line={line} locale={locale}/><strong>{money(lineTotal(variant, line.unit, line.quantity), locale)}</strong></div><button className="icon-button" aria-label={`${t.remove}: ${product.name[locale]}`} onClick={() => remove(cartKey(line))}><Trash2 size={18}/></button></li>;
        })}</ul>
        <div className="cart-total"><span>{t.total}</span><strong>{money(total, locale)}</strong></div><p className="fine-print">{c.cartNote}</p><Link className="primary-button checkout-link" href={`/${locale}/checkout`} onClick={() => dialog.current?.close()}>{c.cartLink}</Link>
      </>}
    </dialog>
  </CartContext.Provider>;
}
