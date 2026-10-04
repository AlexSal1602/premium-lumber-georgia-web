import type { Locale } from '../site';

export type Localized = Record<Locale, string>;
export type Category = string;
export type Species = 'pine' | 'spruce' | 'larch' | 'oak' | 'red-oak' | 'ash' | 'beech' | 'linden' | 'alder' | 'maple';
export type Grade = 'premium' | 'A' | 'B' | 'C' | 'AB' | 'ABC' | 'BC';
export type Moisture = 'green' | 'air-dried' | 'kiln-dried' | 'thermo';
export type Unit = 'm3' | 'm2' | 'lm' | 'piece';
export interface Dimensions { thickness: number; width: number; length: number }
export interface ProductVariant {
  stockQuantity?: string;
  stockUnit?: Unit;
  lowStockThreshold?: string;
  trackInventory?: boolean;
  updatedAt?: string;
  inventoryVersion?: number;
  inventoryConfigured?: boolean;
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
