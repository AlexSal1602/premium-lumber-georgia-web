import type { Prisma, PrismaClient } from '@prisma/client';
import type { Product, Localized } from './types';

import { localized } from '../localized';
import { products } from './products';
import { categoryLabels } from './i18n';

type Row = Prisma.ProductGetPayload<{ include: { variants: true; category: true } }>;
export function toProduct(row: Row): Product {
  const demo = products.find(product => product.id === row.id);
  return {
    id: row.id, category: row.categoryId, categoryName: localized(row.category.name, categoryLabels[row.categoryId]),
    name: localized(row.name, demo?.name), shortDescription: localized(row.shortDescription, demo?.shortDescription), description: localized(row.description, demo?.description),
    images: (row.images as unknown as Product['images']).map((image, i) => ({ ...image, alt: localized(image.alt, demo?.images[i]?.alt ?? localized(row.name, demo?.name)) })), species: row.species as Product['species'], grade: row.grade as Product['grade'],
    moisture: row.moisture as Product['moisture'], units: row.units as Product['units'],
    variants: row.variants.map(v => ({ id: v.id, inventoryConfigured: v.inventoryVersion > 0, trackInventory: v.trackInventory, stockQuantity: v.trackInventory ? v.stockQuantity.toFixed(3) : undefined, stockUnit: v.stockUnit as Product['units'][number], lowStockThreshold: v.trackInventory ? v.lowStockThreshold.toFixed(3) : undefined, updatedAt: v.updatedAt.toISOString(), dimensions: { thickness: v.thickness, width: v.width, length: v.length },
      ...(v.coverageWidth === null ? {} : { coverageWidth: v.coverageWidth }), price: { amount: v.priceCents / 100, currency: 'GEL', unit: v.priceUnit as Product['units'][number] }, status: v.status as 'available' | 'on-order' })),
  };
}
export async function readProducts(db: Pick<PrismaClient, 'product'>, ids?: string[]) {
  const rows = await db.product.findMany({ where: { active: true, ...(ids ? { id: { in: ids } } : {}) }, include: { category: true, variants: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  return rows.map(toProduct);
}
