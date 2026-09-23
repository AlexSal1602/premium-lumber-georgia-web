'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ShoppingBag, Check } from 'lucide-react';
import type { Locale } from '@/lib/site';
import type { Product, Unit } from '@/lib/catalog/types';
import { catalogText, categoryLabels, speciesLabels, moistureLabels, unitLabels, money } from '@/lib/catalog/i18n';
import { dimensionText, lineTotal, pricePerUnit, validQuantity } from '@/lib/catalog/logic';
import { useCart } from './cart-provider';

export function ProductDetail({ product, locale, initialVariant }: { product: Product; locale: Locale; initialVariant?: string }) {
  const t = catalogText[locale]; const cart = useCart();
  const [variantId, setVariantId] = useState(product.variants.find(v => v.id === initialVariant)?.id ?? product.variants[0].id);
  const variant = product.variants.find(v => v.id === variantId)!;
  const [image, setImage] = useState(0); const [unit, setUnit] = useState<Unit>(variant.price.unit);
  const [quantity, setQuantity] = useState('1'); const [message, setMessage] = useState(''); const [submitted, setSubmitted] = useState(false);
  const numericQuantity = Number(quantity); const valid = validQuantity(numericQuantity, unit);
  function chooseVariant(id: string) { setVariantId(id); setMessage(''); const url = new URL(window.location.href); url.searchParams.set('variant', id); window.history.replaceState(null, '', url.pathname + url.search); }
  const specs = [[t.category, (product.categoryName ?? categoryLabels[product.category])?.[locale] ?? product.category], [t.species, speciesLabels[product.species][locale]], [t.grade, product.grade], [t.moisture, moistureLabels[product.moisture][locale]], [t.coverage, `${variant.coverageWidth ?? variant.dimensions.width} ${t.mm}`]];
  return <main id="main" className="detail-page container"><nav className="breadcrumbs" aria-label={t.catalog}><Link href={`/${locale}`}>{t.home}</Link><span>/</span><Link href={`/${locale}/catalog`}>{t.catalog}</Link><span>/</span><span>{product.name[locale]}</span></nav><Link className="back-link" href={`/${locale}/catalog`}><ArrowLeft size={16}/>{t.back}</Link>
    <div className="detail-top"><section className="product-gallery" aria-label={t.gallery}><div className="gallery-main"><img src={product.images[image].src} alt={product.images[image].alt[locale]}/><span className="gallery-count">{image + 1} / {product.images.length}</span></div><div className="gallery-thumbnails">{product.images.map((photo, i) => <button key={photo.src} className={i === image ? 'selected' : ''} aria-label={`${t.photo} ${i + 1}`} aria-pressed={i === image} onClick={() => setImage(i)}><img src={photo.src} alt={photo.alt[locale]}/></button>)}</div></section>
      <section className="product-summary"><p className="eyebrow">{(product.categoryName ?? categoryLabels[product.category])?.[locale] ?? product.category} / {product.grade}</p><h1>{product.name[locale]}</h1><p className="product-code">ID: {product.id}</p><p className="product-short">{product.shortDescription[locale]}</p><span className={`stock-badge inline-badge ${variant.status}`}><Check size={13}/>{variant.status === 'available' ? t.available : t.onOrder}</span>
        <form onSubmit={event => { event.preventDefault(); setSubmitted(true); if (valid) setMessage(cart.add({ productId: product.id, variantId, quantity: numericQuantity, unit }) ? t.added : t.limit); }} noValidate>
          <label className="form-field">{t.variant} ({t.mm})<select value={variantId} onChange={event => chooseVariant(event.target.value)}>{product.variants.map(v => <option key={v.id} value={v.id}>{dimensionText(v)} — {v.status === 'available' ? t.available : t.onOrder}</option>)}</select></label>
          <p className="detail-price">{money(pricePerUnit(variant, unit), locale)} <span>/ {unitLabels[unit][locale]}</span></p>
          <div className="purchase-inputs"><label className="form-field">{t.quantity}<input type="number" inputMode={unit === 'piece' ? 'numeric' : 'decimal'} min={unit === 'piece' ? 1 : .001} max={10000} step={unit === 'piece' ? 1 : .001} value={quantity} aria-invalid={submitted && !valid} aria-describedby={submitted && !valid ? 'quantity-error' : undefined} onChange={event => { setQuantity(event.target.value); setMessage(''); }}/></label><label className="form-field">{t.unit}<select value={unit} onChange={event => { setUnit(event.target.value as Unit); setMessage(''); }}>{product.units.map(u => <option value={u} key={u}>{unitLabels[u][locale]}</option>)}</select></label></div>
          {submitted && !valid && <p id="quantity-error" className="form-error" role="alert">{t.invalidQuantity}</p>}
          <div className="purchase-total"><span>{t.total}</span><strong>{valid ? money(lineTotal(variant, unit, numericQuantity), locale) : '—'}</strong></div><button type="submit" className="primary-button add-to-cart" disabled={!cart.ready}><ShoppingBag size={19}/>{t.add}</button><p className="add-status" role="status">{message}</p>
        </form><p className="fine-print">{product.units.length > 1 ? t.conversion : t.cartNote}</p>
      </section>
    </div>
    <div className="detail-bottom"><section><h2>{t.description}</h2><p className="long-description">{product.description[locale]}</p><h2>{t.specifications}</h2><dl className="spec-list">{specs.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>
      <section><h2>{t.dimensions} ({t.mm})</h2><div className="table-scroll"><table className="dimension-table"><caption className="sr-only">{t.variant}</caption><thead><tr><th>{t.thickness}</th><th>{t.width}</th><th>{t.length}</th><th>{t.price}</th><th>{t.status}</th></tr></thead><tbody>{product.variants.map(v => <tr key={v.id} className={v.id === variantId ? 'selected-row' : ''}><td><label className="table-radio"><input type="radio" name="dimension-row" checked={variantId === v.id} aria-label={`${t.variant}: ${dimensionText(v)}`} onChange={() => chooseVariant(v.id)}/>{v.dimensions.thickness}</label></td><td>{v.dimensions.width}</td><td>{v.dimensions.length}</td><td>{money(v.price.amount, locale)} / {unitLabels[v.price.unit][locale]}</td><td>{v.status === 'available' ? t.available : t.onOrder}</td></tr>)}</tbody></table></div></section></div>
  </main>;
}
