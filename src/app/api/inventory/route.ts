import { db } from '@/lib/db';
import { readProducts } from '@/lib/catalog/repository';
import { orderLineSchema } from '@/lib/checkout/schema';
import { stockIssues } from '@/lib/inventory/quantity';
import { readBody, json } from '@/lib/admin/http';
import { z } from 'zod';

export async function GET() {
  try {
    const products = await readProducts(db);
    return json({ items: products.flatMap(p => p.variants.map(v => ({ productId: p.id, id: v.id, status: v.status, trackInventory: v.trackInventory, stockQuantity: v.stockQuantity, lowStockThreshold: v.lowStockThreshold, stockUnit: v.stockUnit, inventoryConfigured: v.inventoryConfigured, updatedAt: v.updatedAt }))) });
  } catch { return json({ code: 'UNAVAILABLE' }, 503); }
}

export async function POST(request: Request) {
  try {
    const { items } = z.object({ items: z.array(orderLineSchema).max(100) }).strict().parse(await readBody(request, 64000));
    const products = await readProducts(db, [...new Set(items.map(i => i.productId))]);
    if (items.some(i => !products.some(p => p.id === i.productId && p.units.includes(i.unit) && p.variants.some(v => v.id === i.variantId)))) return json({ code: 'INVALID_CART' }, 422);
    const issues = stockIssues(items, products);
    return json({ issues }, issues.length ? 409 : 200);
  } catch (error) { return json({ code: error instanceof z.ZodError ? 'INVALID_CART' : 'UNAVAILABLE' }, error instanceof z.ZodError ? 422 : 503); }
}
