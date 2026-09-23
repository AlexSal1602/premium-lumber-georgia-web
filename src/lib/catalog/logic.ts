import type { Locale } from '../site';
import type { CartLine, Filters, Product, ProductVariant, Unit } from './types';
import { categoryLabels, moistureLabels, speciesLabels } from './i18n';

export const defaultFilters: Filters = { query: '', category: [], species: [], grade: [], moisture: [], thickness: '', width: '', length: '', sort: 'name-asc' };
export const dimensionText = (v: ProductVariant) => `${v.dimensions.thickness} × ${v.dimensions.width} × ${v.dimensions.length}`;
export function measurePerPiece(v: ProductVariant, unit: Unit): number {
  const { thickness, width, length } = v.dimensions;
  return { piece: 1, lm: length / 1000, m2: (v.coverageWidth ?? width) * length / 1e6, m3: thickness * width * length / 1e9 }[unit];
}
export const pricePerUnit = (v: ProductVariant, unit: Unit) => v.price.amount * measurePerPiece(v, v.price.unit) / measurePerPiece(v, unit);
export const lineTotal = (v: ProductVariant, unit: Unit, quantity: number) => Math.round(pricePerUnit(v, unit) * quantity * 100) / 100;
export function validQuantity(quantity: number, unit: Unit) {
  return Number.isFinite(quantity) && quantity > 0 && quantity <= 10000 && (unit === 'piece' ? Number.isInteger(quantity) : Math.abs(quantity * 1000 - Math.round(quantity * 1000)) < 1e-7);
}
export function matchingVariants(product: Product, filters: Filters) {
  return product.variants.filter(v => (['thickness', 'width', 'length'] as const).every(key => !filters[key] || v.dimensions[key] === Number(filters[key])));
}
export function filterProducts(products: Product[], filters: Filters, locale: Locale) {
  const terms = filters.query.normalize('NFKC').toLocaleLowerCase(locale).trim().split(/\s+/).filter(Boolean);
  const matches = products.filter(product => {
    const haystack = [product.id, ...Object.values(product.name), ...Object.values(product.shortDescription), ...Object.values(product.categoryName ?? categoryLabels[product.category] ?? {}), ...Object.values(speciesLabels[product.species]), ...Object.values(moistureLabels[product.moisture]), product.grade].join(' ').normalize('NFKC').toLocaleLowerCase(locale);
    return terms.every(term => haystack.includes(term)) && (['category', 'species', 'grade', 'moisture'] as const).every(key => !filters[key].length || filters[key].includes(product[key])) && matchingVariants(product, filters).length > 0;
  });
  return matches.sort((a, b) => {
    const nameOrder = a.name[locale].localeCompare(b.name[locale], locale);
    if (filters.sort.startsWith('name')) return filters.sort === 'name-desc' ? -nameOrder : nameOrder;
    const delta = pricePerUnit(matchingVariants(a, filters)[0], 'piece') - pricePerUnit(matchingVariants(b, filters)[0], 'piece');
    return (filters.sort === 'price-desc' ? -delta : delta) || nameOrder;
  });
}
export function parseFilters(params: URLSearchParams): Filters {
  const sort = params.get('sort');
  return { query: params.get('q') ?? '', category: params.getAll('category'), species: params.getAll('species'), grade: params.getAll('grade'), moisture: params.getAll('moisture'), thickness: params.get('thickness') ?? '', width: params.get('width') ?? '', length: params.get('length') ?? '', sort: sort === 'name-desc' || sort === 'price-asc' || sort === 'price-desc' ? sort : 'name-asc' };
}
export function serializeFilters(filters: Filters) {
  const params = new URLSearchParams();
  if (filters.query) params.set('q', filters.query);
  for (const key of ['category', 'species', 'grade', 'moisture'] as const) filters[key].forEach(value => params.append(key, value));
  for (const key of ['thickness', 'width', 'length'] as const) if (filters[key]) params.set(key, filters[key]);
  if (filters.sort !== 'name-asc') params.set('sort', filters.sort);
  return params.toString();
}
export const cartKey = (line: Pick<CartLine, 'productId' | 'variantId' | 'unit'>) => `${line.productId}:${line.variantId}:${line.unit}`;
/** Never trust localStorage prices or product references. */
export function restoreCart(raw: unknown, products: Product[]): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const result: CartLine[] = [];
  for (const item of raw.slice(0, 200)) {
    if (!item || typeof item !== 'object') continue;
    const product = products.find(p => p.id === item.productId);
    if (!product || !product.variants.some(v => v.id === item.variantId) || !product.units.includes(item.unit) || !validQuantity(item.quantity, item.unit)) continue;
    const line: CartLine = { productId: product.id, variantId: item.variantId, unit: item.unit, quantity: item.quantity };
    const existing = result.find(entry => cartKey(entry) === cartKey(line));
    if (existing) existing.quantity = Math.min(10000, Math.round((existing.quantity + line.quantity) * 1000) / 1000);
    else result.push(line);
  }
  return result;
}
