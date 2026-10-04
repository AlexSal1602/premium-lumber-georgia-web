'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import type { Locale } from '@/lib/site';
import { useCart } from './cart-provider';
import { gradeLabels, catalogText, speciesLabels, moistureLabels } from '@/lib/catalog/i18n';
import { filterProducts, matchingVariants, parseFilters, serializeFilters } from '@/lib/catalog/logic';
import type { Filters, Sort } from '@/lib/catalog/types';
import { catalogNavigationText, clearFilters, toggleFilter, type FilterGroup } from '@/lib/catalog/navigation';
import { ProductCard } from './product-card';

export function Catalog({ locale }: { locale: Locale }) {
  const { products, categories } = useCart();
  const t = catalogText[locale]; const n = catalogNavigationText[locale]; const params = useSearchParams();
  const filters = useMemo(() => parseFilters(new URLSearchParams(params.toString())), [params]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const result = useMemo(() => filterProducts(products, filters, locale), [products, filters, locale]);
  const update = (patch: Partial<Filters>) => { const query = serializeFilters({ ...filters, ...patch }); window.history.pushState(null, '', `/${locale}/catalog${query ? `?${query}` : ''}`); };
  const reset = () => update(clearFilters(filters));
  const groups = [
    { key: 'category' as const, title: t.category, options: categories.map(c => ({ value: c.id, label: c.name[locale] })) },
    { key: 'species' as const, title: t.species, options: Object.entries(speciesLabels).map(([value, labels]) => ({ value, label: labels[locale] })) },
    { key: 'grade' as const, title: t.grade, options: Object.entries(gradeLabels).map(([value, labels]) => ({ value, label: labels[locale] })) },
    { key: 'moisture' as const, title: t.moisture, options: Object.entries(moistureLabels).map(([value, labels]) => ({ value, label: labels[locale] })) },
  ];
  const quick: { key: FilterGroup; value: string; label: string }[] = [
    { key: 'species', value: 'pine', label: speciesLabels.pine[locale] },
    { key: 'species', value: 'oak', label: speciesLabels.oak[locale] },
    ...['board', 'decking'].flatMap(id => { const category = categories.find(c => c.id === id); return category ? [{ key: 'category' as const, value: id, label: category.name[locale] }] : []; }),
    { key: 'grade', value: 'premium', label: gradeLabels.premium[locale] },
    { key: 'moisture', value: 'kiln-dried', label: moistureLabels['kiln-dried'][locale] },
    { key: 'moisture', value: 'thermo', label: moistureLabels.thermo[locale] },
  ];
  const selected = [
    ...groups.flatMap(group => filters[group.key].map(value => ({ id: group.key + value, label: group.title + ': ' + (group.options.find(o => o.value === value)?.label ?? value), remove: () => update({ [group.key]: filters[group.key].filter(item => item !== value) }) }))),
    ...(['thickness', 'width', 'length'] as const).filter(key => filters[key]).map(key => ({ id: key, label: t[key] + ': ' + filters[key] + ' ' + t.mm, remove: () => update({ [key]: '' }) })),
    ...(filters.query.trim() ? [{ id: 'query', label: t.search + ': ' + filters.query, remove: () => update({ query: '' }) }] : []),
  ];
  return <main id="main" className="catalog-page"><div className="catalog-banner"><div className="container"><nav className="breadcrumbs" aria-label={t.catalog}><Link href={`/${locale}`}>{t.home}</Link><span>/</span><span>{t.catalog}</span></nav><p className="eyebrow">PREMIUM LUMBER GEORGIA / {t.catalog}</p><h1>{t.catalog}</h1><p>{t.subtitle}</p></div></div>
    <div className="container"><div className="catalog-layout">
      <button className="mobile-filter-button secondary-button" aria-expanded={filtersOpen} aria-controls="catalog-filters" onClick={() => setFiltersOpen(!filtersOpen)}>{filtersOpen ? <X size={18}/> : <SlidersHorizontal size={18}/>} {t.filters}</button>
      <aside id="catalog-filters" className={`filter-sidebar ${filtersOpen ? 'is-open' : ''}`} aria-label={t.filters}><div className="filter-heading"><h2>{t.filters}</h2><button onClick={reset}>{t.reset}</button></div>
        {groups.map(group => <fieldset key={group.key}><legend>{group.title}</legend>{group.options.map(option => <label className="checkbox-label" key={option.value}><input type="checkbox" checked={filters[group.key].includes(option.value)} onChange={event => update({ [group.key]: event.target.checked ? [...filters[group.key], option.value] : filters[group.key].filter(value => value !== option.value) })}/><span>{option.label}</span></label>)}</fieldset>)}
        <fieldset><legend>{t.dimensions} ({t.mm})</legend>{(['thickness', 'width', 'length'] as const).map(key => <label className="dimension-filter" key={key}>{t[key]}<select value={filters[key]} onChange={e => update({ [key]: e.target.value })}><option value="">{t.any}</option>{Array.from(new Set(products.flatMap(p => p.variants.map(v => v.dimensions[key])))).sort((a,b) => a-b).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}</fieldset>
      </aside>
      <section className="catalog-results" aria-label={t.catalog}><div className="catalog-toolbar"><label className="search-field"><Search size={18}/><span className="sr-only">{t.search}</span><input type="search" placeholder={t.search} value={filters.query} onChange={e => update({ query: e.target.value })}/></label><label className="sort-field"><span className="sr-only">{t.sort}</span><select value={filters.sort} onChange={e => update({ sort: e.target.value as Sort })}><option value="name-asc">{t.nameAsc}</option><option value="name-desc">{t.nameDesc}</option><option value="price-asc">{t.priceAsc}</option><option value="price-desc">{t.priceDesc}</option></select></label></div>
        <section className="quick-selection" aria-label={n.quick}><h2>{n.quick}</h2><div className="quick-tag-list">{quick.map(tag => <button key={tag.key + tag.value} className="filter-tag" aria-pressed={filters[tag.key].includes(tag.value)} onClick={() => update(toggleFilter(filters, tag.key, tag.value))}>{tag.label}</button>)}</div></section>
        {selected.length > 0 && <section className="selected-filters" aria-label={n.selected}><div className="selected-tag-list">{selected.map(tag => <button key={tag.id} className="selected-filter-tag" aria-label={n.remove + ': ' + tag.label} onClick={tag.remove}><span>{tag.label}</span><X size={14} aria-hidden="true"/></button>)}<button className="clear-filter-tags" onClick={reset}>{n.clear}</button></div></section>}
        <div className="results-meta"><p role="status">{result.length} {t.results}</p><p>{t.priceBasis}</p></div>
        {result.length ? <div className="catalog-grid">{result.map(product => { const variant = matchingVariants(product, filters)[0]; return <ProductCard key={`${product.id}-${variant.id}`} product={product} variant={variant} locale={locale}/>; })}</div> : <div className="empty-results"><Search size={35}/><h2>{t.empty}</h2><p>{t.emptyHelp}</p><button className="primary-button" onClick={reset}>{t.reset}</button></div>}
      </section>
    </div></div>
  </main>;
}
