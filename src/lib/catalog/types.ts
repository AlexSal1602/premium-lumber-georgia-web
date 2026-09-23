import type { Locale } from '../site';

export type Localized = Record<Locale, string>;
export type Category = string;
export type Species = 'pine' | 'spruce' | 'larch';
export type Grade = 'A' | 'B' | 'AB' | 'Extra';
export type Moisture = 'green' | 'air-dried' | 'kiln-dried';
export type Unit = 'm3' | 'm2' | 'lm' | 'piece';
export interface Dimensions { thickness: number; width: number; length: number }
export interface ProductVariant {
  id: string;
  /** Millimetres. Nominal dimensions used for billing, not engineering calculations. */
  dimensions: Dimensions;
  /** Effective installed width in mm for tongue-and-groove boards. */
  coverageWidth?: number;
  price: { amount: number; currency: 'GEL'; unit: Unit };
  status: 'available' | 'on-order';
}
export interface Product {
  id: string;
  category: Category;
  categoryName?: Localized;
  images: { src: string; alt: Localized }[];
  name: Localized;
  shortDescription: Localized;
  description: Localized;
  species: Species;
  grade: Grade;
  moisture: Moisture;
  units: Unit[];
  variants: ProductVariant[];
}
export interface CartLine { productId: string; variantId: string; unit: Unit; quantity: number }
export type Sort = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc';
export interface Filters {
  query: string; category: string[]; species: string[]; grade: string[]; moisture: string[];
  thickness: string; width: string; length: string; sort: Sort;
}
