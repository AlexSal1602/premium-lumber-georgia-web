import { Prisma, type PrismaClient, type ProductVariant as Row } from '@prisma/client';
import { z } from 'zod';
import { changedQuantity, decimal, milli, requiredStock, type StockIssue } from './quantity';
import type { ProductVariant, Unit } from '../catalog/types';

export class InventoryError extends Error {
  constructor(public code: 'INVALID_QUANTITY' | 'CONFLICT' | 'INSUFFICIENT_STOCK' | 'NOT_FOUND', public issues: StockIssue[] = []) { super(code); }
}
const amount = z.string().regex(/^\d{1,15}(?:\.\d{1,3})?$/);
export const inventorySchema = z.object({
  variantId: z.string().min(1).max(120), version: z.number().int().nonnegative(),
  action: z.enum(['add','subtract','set']), quantity: amount,
  type: z.enum(['SALE','RECEIPT','RETURN','ADJUSTMENT','DAMAGE','INITIAL']),
  reason: z.string().trim().min(1).max(200), note: z.string().trim().max(2000),
  lowStockThreshold: amount, trackInventory: z.boolean(),
  stockUnit: z.enum(['piece','m3','m2','lm']).default('piece'),
}).strict().superRefine((v, ctx) => {
  if ((['SALE','DAMAGE'].includes(v.type) && v.action !== 'subtract') || (['RECEIPT','RETURN'].includes(v.type) && v.action !== 'add') || (v.type === 'INITIAL' && v.action !== 'set')) ctx.addIssue({ code: 'custom', path: ['type'], message: 'INVALID_QUANTITY' });
});
export const orderInventorySchema = z.object({ orderId: z.number().int().positive(), action: z.enum(['sell','return']) }).strict();
export const variantView = (v: Row): ProductVariant => ({ id: v.id, inventoryConfigured: v.inventoryVersion > 0, dimensions: { thickness: v.thickness, width: v.width, length: v.length }, coverageWidth: v.coverageWidth ?? undefined, price: { amount: v.priceCents / 100, currency: 'GEL', unit: v.priceUnit as Unit }, status: v.status as ProductVariant['status'], trackInventory: v.trackInventory, stockQuantity: v.stockQuantity.toFixed(3), stockUnit: v.stockUnit as Unit, lowStockThreshold: v.lowStockThreshold.toFixed(3), inventoryVersion: v.inventoryVersion, updatedAt: v.updatedAt.toISOString() });
export async function lockVariants(tx: Prisma.TransactionClient, ids: string[]) {
  if (ids.length) await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProductVariant" WHERE "id" IN (${Prisma.join([...new Set(ids)].sort())}) ORDER BY "id" FOR UPDATE`);
}
async function movement(tx: Prisma.TransactionClient, v: Row, after: string, data: { type: 'SALE' | 'RECEIPT' | 'RETURN' | 'ADJUSTMENT' | 'DAMAGE' | 'INITIAL'; reason: string; note: string; adminId: string; orderId?: number }, settings?: { lowStockThreshold: string; trackInventory: boolean; stockUnit: string }) {
  if (milli(after) > milli('999999999999999.999')) throw new InventoryError('INVALID_QUANTITY');
  await tx.productVariant.update({ where: { id: v.id }, data: { stockQuantity: after, ...settings, inventoryVersion: { increment: 1 } } });
  await tx.inventoryMovement.create({ data: { ...data, productId: v.productId, variantId: v.id, stockUnit: settings?.stockUnit ?? v.stockUnit, beforeQuantity: v.stockQuantity, afterQuantity: after, quantity: decimal(milli(after) - milli(v.stockQuantity.toFixed(3))) } });
}
export async function adjustInventory(db: PrismaClient, input: z.infer<typeof inventorySchema>, adminId: string) {
  return db.$transaction(async tx => {
    await lockVariants(tx, [input.variantId]);
    const v = await tx.productVariant.findUnique({ where: { id: input.variantId } });
    if (!v) throw new InventoryError('NOT_FOUND');
    if (v.inventoryVersion !== input.version) throw new InventoryError('CONFLICT');
    if (input.stockUnit !== v.stockUnit && (!v.stockQuantity.isZero() || await tx.inventoryMovement.count({ where: { variantId: v.id } }))) throw new InventoryError('CONFLICT');
    if (input.type === 'INITIAL' && await tx.inventoryMovement.count({ where: { variantId: v.id } })) throw new InventoryError('CONFLICT');
    let after: string;
    try { after = changedQuantity(v.stockQuantity.toFixed(3), input.action, input.quantity); } catch { throw new InventoryError('INVALID_QUANTITY'); }
    await movement(tx, v, after, { type: input.type, reason: input.reason, note: input.note, adminId }, { lowStockThreshold: input.lowStockThreshold, trackInventory: input.trackInventory, stockUnit: input.stockUnit });
  }, { maxWait: 15000, timeout: 30000 });
}
export async function orderInventory(db: PrismaClient, orderId: number, action: 'sell' | 'return', adminId: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE`);
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new InventoryError('NOT_FOUND');
    if (action === 'sell' ? !!order.inventoryDeductedAt || order.status === 'CANCELLED' : !order.inventoryDeductedAt || !!order.inventoryReturnedAt || order.status !== 'CANCELLED') throw new InventoryError('CONFLICT');
    const sales = action === 'return' ? await tx.inventoryMovement.findMany({ where: { orderId, type: 'SALE' } }) : [];
    const ids = [...new Set(action === 'sell' ? order.items.map(i => i.variantId) : sales.map(s => s.variantId))].sort();
    await lockVariants(tx, ids);
    for (const id of ids) {
      const v = await tx.productVariant.findUnique({ where: { id } });
      if (!v) throw new InventoryError('NOT_FOUND');
      if (action === 'sell' && (!v.trackInventory || v.status === 'on-order')) continue;
      const quantity = action === 'sell' ? requiredStock(order.items.filter(i => i.variantId === id).map(i => ({ unit: i.unit as Unit, quantity: decimal(BigInt(i.quantityMilli)) })), variantView(v)) : sales.filter(s => s.variantId === id).reduce((sum, s) => sum + milli(s.beforeQuantity.toFixed(3)) - milli(s.afterQuantity.toFixed(3)), BigInt(0));
      const before = milli(v.stockQuantity.toFixed(3));
      if (action === 'sell' && quantity > before) throw new InventoryError('INSUFFICIENT_STOCK', [{ productId: v.productId, variantId: id, available: v.stockQuantity.toFixed(3), unit: v.stockUnit as Unit }]);
      await movement(tx, v, decimal(action === 'sell' ? before - quantity : before + quantity), { type: action === 'sell' ? 'SALE' : 'RETURN', reason: `ORD-${orderId + 1023}`, note: '', adminId, orderId });
    }
    await tx.order.update({ where: { id: orderId }, data: action === 'sell' ? { inventoryDeductedAt: new Date(), status: 'COMPLETED' } : { inventoryReturnedAt: new Date() } });
  }, { maxWait: 15000, timeout: 30000 });
}
