import type { Prisma, PrismaClient } from '@prisma/client';
import type { Product, Localized } from './types';

type Row = Prisma.ProductGetPayload<{ include: { variants: true; category: true } }>;
export function toProduct(row: Row): Product {
  return {
    id: row.id, category: row.categoryId, categoryName: row.category.name as Localized,
    name: row.name as Localized, shortDescription: row.shortDescription as Localized, description: row.description as Localized,
    images: row.images as unknown as Product['images'], species: row.species as Product['species'], grade: row.grade as Product['grade'],
    moisture: row.moisture as Product['moisture'], units: row.units as Product['units'],
    variants: row.variants.map(v => ({ id: v.id, dimensions: { thickness: v.thickness, width: v.width, length: v.length },
      ...(v.coverageWidth === null ? {} : { coverageWidth: v.coverageWidth }), price: { amount: v.priceCents / 100, currency: 'GEL', unit: v.priceUnit as Product['units'][number] }, status: v.status as 'available' | 'on-order' })),
  };
}
export async function readProducts(db: PrismaClient, ids?: string[]) {
  const rows = await db.product.findMany({ where: { active: true, ...(ids ? { id: { in: ids } } : {}) }, include: { category: true, variants: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'asc' } });
  return rows.map(toProduct);
}
