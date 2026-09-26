'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Locale } from '@/lib/site';
import { useCart } from './cart-provider';
import { catalogText, categoryLabels, speciesLabels, moistureLabels } from '@/lib/catalog/i18n';
import { defaultFilters, filterProducts, matchingVariants, parseFilters, serializeFilters } from '@/lib/catalog/logic';
import type { Filters, Sort } from '@/lib/catalog/types';
import { ProductCard } from './product-card';

export function Catalog({ locale }: { locale: Locale }) {
  const { products, categories } = useCart();
  const t = catalogText[locale]; const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const result = useMemo(() => filterProducts(products, filters, locale), [products, filters, locale]);
  const update = (patch: Partial<Filters>) => { const query = serializeFilters({ ...filters, ...patch }); window.history.replaceState(null, '', `/${locale}/catalog${query ? `?${query}` : ''}`); };
  const reset = () => update(defaultFilters);
  const groups = [
    { key: 'category' as const, title: t.category, options: categories.map(c => ({ value: c.id, label: c.name[locale] })) },
    { key: 'species' as const, title: t.species, options: Object.entries(speciesLabels).map(([value, labels]) => ({ value, label: labels[locale] })) },
    { key: 'grade' as const, title: t.grade, options: ['A', 'B', 'AB', 'Extra'].map(value => ({ value, label: value })) },
    { key: 'moisture' as const, title: t.moisture, options: Object.entries(moistureLabels).map(([value, labels]) => ({ value, label: labels[locale] })) },
  ];
  return <main id="main" className="catalog-page"><div className="catalog-banner"><div className="container"><nav className="breadcrumbs" aria-label={t.catalog}><Link href={`/${locale}`}>{t.home}</Link><span>/</span><span>{t.catalog}</span></nav><p className="eyebrow">PREMIUM LUMBER GEORGIA / {t.catalog}</p><h1>{t.catalog}</h1><p>{t.subtitle}</p></div></div>
    <div className="container"><div className="catalog-layout">
      <button className="mobile-filter-button secondary-button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? <X size={18}/> : <SlidersHorizontal size={18}/>} {t.filters}</button>
      <aside id="catalog-filters" className={`filter-sidebar ${filtersOpen ? 'is-open' : ''}`} aria-label={t.filters}><div className="filter-heading"><h2>{t.filters}</h2><button onClick={reset}>{t.reset}</button></div>
        {groups.map(group => <fieldset key={group.key}><legend>{group.title}</legend>{group.options.map(option => <label className="checkbox-label" key={option.value}><input type="checkbox" checked={filters[group.key].includes(option.value)} onChange={event => update({ [group.key]: event.target.checked ? [...filters[group.key], option.value] : filters[group.key].filter(value => value !== option.value) })}/><span>{option.label}</span></label>)}</fieldset>)}
        <fieldset><legend>{t.dimensions} ({t.mm})</legend>{(['thickness', 'width', 'length'] as const).map(key => <label className="dimension-filter" key={key}>{t[key]}<select value={filters[key]} onChange={e => update({ [key]: e.target.value })}><option value="">{t.any}</option>{Array.from(new Set(products.flatMap(p => p.variants.map(v => v.dimensions[key])))).sort((a,b) => a-b).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</fieldset>
      </aside>
      <section className="catalog-results" aria-label={t.catalog}><div className="catalog-toolbar"><label className="search-field"><Search size={18}/><span className="sr-only">{t.search}</span><input type="search" placeholder={t.search} value={filters.query} onChange={e => update({ query: e.target.value })}/></label><label className="sort-field"><span className="sr-only">{t.sort}</span><select value={filters.sort} onChange={e => update({ sort: e.target.value as Sort })}><option value="name-asc">{t.nameAsc}</option><option value="name-desc">{t.nameDesc}</option><option value="price-asc">{t.priceAsc}</option><option value="price-desc">{t.priceDesc}</option></select></label></div>
        <div className="results-meta"><p role="status">{result.length} {t.results}</p><p>{t.priceBasis}</p></div>
        {result.length ? <div className="catalog-grid">{result.map(product => { const variant = matchingVariants(product, filters)[0]; return <ProductCard key={`${product.id}-${variant.id}`} product={product} variant={variant} locale={locale}/>; })}</div> : <div className="empty-results"><Search size={35}/><h2>{t.empty}</h2><p>{t.emptyHelp}</p><button className="primary-button" onClick={reset}>{t.reset}</button></div>}
      </section>
    </div></div>
  </main>;
}
