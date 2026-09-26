import type { CartLine, Product, ProductVariant, Unit } from '../catalog/types';

// All stock arithmetic uses scaled integers or exact rational fractions. Number is
// used only at the existing cart boundary, never for inventory calculations.
export function milli(value: string): bigint {
  if (!/^\d{1,15}(?:\.\d{1,3})?$/.test(value)) throw new Error('INVALID_QUANTITY');
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * BigInt(1000) + BigInt(fraction.padEnd(3, '0'));
}
export function decimal(value: bigint): string {
  const sign = value < BigInt(0) ? '-' : ''; const abs = value < BigInt(0) ? -value : value;
  return `${sign}${abs / BigInt(1000)}.${String(abs % BigInt(1000)).padStart(3, '0')}`;
}

export function displayQuantity(value: string): string {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}
type Fraction = [bigint, bigint];
function rational(value: number | string): Fraction {
  const [mantissa, exponent = '0'] = String(value).toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const power = fraction.length - Number(exponent);
  return power >= 0 ? [BigInt(whole + fraction), BigInt(10) ** BigInt(power)] : [BigInt(whole + fraction) * BigInt(10) ** BigInt(-power), BigInt(1)];
}
const multiply = (a: Fraction, b: Fraction): Fraction => [a[0] * b[0], a[1] * b[1]];
function measure(v: ProductVariant, unit: Unit): Fraction {
  const { thickness, width, length } = v.dimensions;
  if (unit === 'piece') return [BigInt(1), BigInt(1)];
  if (unit === 'lm') return multiply(rational(length), [BigInt(1), BigInt(1000)]);
  if (unit === 'm2') return multiply(multiply(rational(v.coverageWidth ?? width), rational(length)), [BigInt(1), BigInt(1000000)]);
  return multiply(multiply(multiply(rational(thickness), rational(width)), rational(length)), [BigInt(1), BigInt(1000000000)]);
}
export function requiredStock(lines: { quantity: number | string; unit: Unit }[], v: ProductVariant): bigint {
  const stock = measure(v, v.stockUnit ?? 'piece');
  let numerator = BigInt(0), denominator = BigInt(1);
  for (const line of lines) {
    const quantity = rational(line.quantity), unit = measure(v, line.unit);
    const n = quantity[0] * stock[0] * unit[1] * BigInt(1000), d = quantity[1] * stock[1] * unit[0];
    numerator = numerator * d + n * denominator; denominator *= d;
  }
  // Round up only once per variant; a fractional requirement must never under-deduct.
  return (numerator + denominator - BigInt(1)) / denominator;
}
export type StockIssue = { productId: string; variantId: string; available: string; unit: Unit };
export function stockIssues(lines: CartLine[], products: Product[]): StockIssue[] {
  const issues: StockIssue[] = [];
  for (const p of products) for (const v of p.variants) {
    const selected = lines.filter(l => l.productId === p.id && l.variantId === v.id);
    if (selected.length && v.trackInventory && v.status !== 'on-order' && requiredStock(selected, v) > milli(v.stockQuantity ?? '0')) issues.push({ productId: p.id, variantId: v.id, available: v.stockQuantity ?? '0', unit: v.stockUnit ?? 'piece' });
  }
  return issues;
}
export function stockStatus(v: ProductVariant) {
  if (!v.trackInventory && v.inventoryConfigured === false && v.status === 'available') return 'legacy';
  if (!v.trackInventory || v.status === 'on-order') return 'on-order';
  const quantity = milli(v.stockQuantity ?? '0');
  return quantity === BigInt(0) ? 'out' : quantity <= milli(v.lowStockThreshold ?? '0') ? 'low' : 'available';
}
export function changedQuantity(before: string, action: 'add' | 'subtract' | 'set', amount: string) {
  const previous = milli(before), value = milli(amount);
  const next = action === 'set' ? value : action === 'add' ? previous + value : previous - value;
  if (next < BigInt(0) || next > milli('999999999999999.999')) throw new Error('INVALID_QUANTITY');
  return decimal(next);
}
