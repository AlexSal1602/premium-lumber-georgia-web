'use client';

import Link from 'next/link';
import { stockLabel } from '@/lib/inventory/i18n';
import { stockStatus } from '@/lib/inventory/quantity';
import { useState } from 'react';
import { ArrowUpRight, ShoppingBag } from 'lucide-react';
import type { Locale } from '@/lib/site';
import type { Product, ProductVariant } from '@/lib/catalog/types';
import { catalogText, money, speciesLabels, unitLabels } from '@/lib/catalog/i18n';
import { dimensionText, pricePerUnit } from '@/lib/catalog/logic';
import { useCart } from './cart-provider';

export function ProductCard({ product, variant, locale }: { product: Product; variant: ProductVariant; locale: Locale }) {
  const t = catalogText[locale]; const cart = useCart(); const [message, setMessage] = useState('');
  const soldOut = stockStatus(variant) === 'out';
  const href = `/${locale}/catalog/${product.id}?variant=${variant.id}`;
  return <article className="catalog-card">
    <Link href={href} className="catalog-image product-link-feedback"><img src={product.images[0].src} alt={product.images[0].alt[locale]} loading="lazy"/><span className={`stock-badge ${stockStatus(variant)}`}>{stockLabel(variant, locale)}</span><span className="image-arrow"><ArrowUpRight size={19}/></span></Link>
    <div className="catalog-card-body"><p className="card-kicker">{speciesLabels[product.species][locale]} · {product.grade}</p><h2><Link href={href} className="product-link-feedback">{product.name[locale]}</Link></h2><p className="card-dimensions">{dimensionText(variant)} {t.mm}</p>
      <p className="card-price">{money(variant.price.amount, locale)} <span>/ {unitLabels[variant.price.unit][locale]}</span></p><p className="fine-print">{t.perPiece}: {money(pricePerUnit(variant, 'piece'), locale)}</p>
      <div className="card-actions"><button className="primary-button" disabled={!cart.ready || soldOut} aria-describedby={soldOut ? `stock-${variant.id}` : undefined} onClick={async () => setMessage(await cart.add({ productId: product.id, variantId: variant.id, unit: 'piece', quantity: 1 }) ? t.added : t.limit)}><ShoppingBag size={16}/>{t.add} · 1 {unitLabels.piece[locale]}</button><Link href={href} className="details-link product-link-feedback">{t.more}<ArrowUpRight size={15}/></Link></div><p id={`stock-${variant.id}`} className="add-status" role="status">{message || (soldOut ? stockLabel(variant, locale) : '')}</p>
    </div>
  </article>;
}
