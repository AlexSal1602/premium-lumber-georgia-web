import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { assertOrigin, failure, json, readBody } from '@/lib/admin/http';
import { adjustInventory, inventorySchema, InventoryError, orderInventory, orderInventorySchema, variantView } from '@/lib/inventory/service';
import { z } from 'zod';
import { Prisma } from '@prisma/client';

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const q = new URL(request.url).searchParams;
    const page = z.coerce.number().int().min(1).max(100000).parse(q.get('page') || 1), take = 25;
    if (q.has('variantId')) {
      const where = { variantId: z.string().min(1).max(120).parse(q.get('variantId')) };
      const [items, count] = await Promise.all([db.inventoryMovement.findMany({ where, take, skip: (page - 1) * take, include: { admin: { select: { email: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] }), db.inventoryMovement.count({ where })]);
      return json({ items, count, page });
    }
    const search = z.string().max(200).parse(q.get('q') || ''), category = q.get('category');
    const status = z.enum(['','low','out']).parse(q.get('status') || '');
    const where: Prisma.ProductVariantWhereInput = {
      ...(category ? { product: { categoryId: category } } : {}),
      ...(search ? { OR: [{ id: { contains: search, mode: 'insensitive' } }, { productId: { contains: search, mode: 'insensitive' } }, ...['ka','en','ru','uk','he','ar'].map(locale => ({ product: { name: { path: [locale], string_contains: search, mode: 'insensitive' as const } } }))] } : {}),
      ...(status ? { trackInventory: true, status: 'available', stockQuantity: status === 'out' ? { equals: 0 } : { gt: 0, lte: db.productVariant.fields.lowStockThreshold } } : {}),
    };
    const [rows, count] = await Promise.all([db.productVariant.findMany({ where, take, skip: (page - 1) * take, include: { product: { select: { name: true, categoryId: true } } }, orderBy: [{ productId: 'asc' }, { position: 'asc' }, { id: 'asc' }] }), db.productVariant.count({ where })]);
    return json({ items: rows.map(v => ({ ...variantView(v), productId: v.productId, productName: v.product.name, categoryId: v.product.categoryId })), count, page });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    assertOrigin(request); const { admin } = await requireAdmin(); const input = await readBody(request);
    if (input && typeof input === 'object' && 'orderId' in input) { const p = orderInventorySchema.parse(input); await orderInventory(db, p.orderId, p.action, admin.id); }
    else await adjustInventory(db, inventorySchema.parse(input), admin.id);
    return json({ ok: true });
  } catch (error) {
    if (error instanceof InventoryError) return json({ code: error.code, issues: error.issues }, error.code === 'NOT_FOUND' ? 404 : error.code === 'INVALID_QUANTITY' ? 422 : 409);
    return failure(error);
  }
}
