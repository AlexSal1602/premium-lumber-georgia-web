import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import type { Product } from '../catalog/types';
import { readProducts } from '../catalog/repository';
import { cartKey, lineTotal, pricePerUnit } from '../catalog/logic';
import type { OrderRequest, OrderReceipt } from './schema';
import { stockIssues, milli } from '../inventory/quantity';
import { InventoryError, lockVariants } from '../inventory/service';

export class OrderError extends Error {
  constructor(public code: 'INVALID_CART' | 'IDEMPOTENCY_CONFLICT') { super(code); }
}
export function quoteOrder(items: OrderRequest['items'], products: Product[]) {
  const issues = stockIssues(items, products);
  if (issues.length) throw new InventoryError('INSUFFICIENT_STOCK', issues);
  const seen = new Set<string>();
  const snapshots = items.map(line => {
    if (seen.has(cartKey(line))) throw new OrderError('INVALID_CART');
    seen.add(cartKey(line));
    const product = products.find(p => p.id === line.productId);
    const variant = product?.variants.find(v => v.id === line.variantId);
    if (!product || !variant || !product.units.includes(line.unit)) throw new OrderError('INVALID_CART');
    const totalCents = Math.round(lineTotal(variant, line.unit, line.quantity) * 100);
    if (!Number.isSafeInteger(totalCents) || totalCents < 1 || totalCents > 2_000_000_000) throw new OrderError('INVALID_CART');
    return {
      productId: product.id, variantId: variant.id,
      nameKa: product.name.ka, nameEn: product.name.en, nameRu: product.name.ru,
      ...variant.dimensions, coverageWidth: variant.coverageWidth,
      species: product.species, grade: product.grade, moisture: product.moisture, availability: variant.status,
      unit: line.unit, quantityMilli: Number(milli(String(line.quantity))),
      basePriceCents: Math.round(variant.price.amount * 100), basePriceUnit: variant.price.unit,
      unitPrice: pricePerUnit(variant, line.unit), totalCents,
    };
  });
  const totalCents = snapshots.reduce((sum, item) => sum + item.totalCents, 0);
  if (!Number.isSafeInteger(totalCents) || totalCents > 2_000_000_000) throw new OrderError('INVALID_CART');
  return { snapshots, totalCents };
}
function receipt(order: { id: number; totalCents: number }): OrderReceipt {
  return { orderNumber: `ORD-${order.id + 1023}`, totalCents: order.totalCents, status: 'NEW', currency: 'GEL' };
}
export async function placeOrder(db: PrismaClient, input: OrderRequest): Promise<OrderReceipt> {
  const sortedItems = [...input.items].sort((a,b) => cartKey(a).localeCompare(cartKey(b)));
  const requestHash = createHash('sha256').update(JSON.stringify({ locale: input.locale, customer: input.customer, items: sortedItems })).digest('hex');
  const existing = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) {
    if (existing.requestHash !== requestHash) throw new OrderError('IDEMPOTENCY_CONFLICT');
    return receipt(existing);
  }
  try {
    // Lock the same rows as stock mutations, then validate immediately before writing.
    const order = await db.$transaction(async tx => {
    await lockVariants(tx, sortedItems.map(item => item.variantId));
    const quote = quoteOrder(sortedItems, await readProducts(tx, sortedItems.map(item => item.productId)));
    return tx.order.create({ data: {
      idempotencyKey: input.idempotencyKey, requestHash, locale: input.locale,
      ...input.customer, email: input.customer.email || null, city: input.customer.city || null,
      address: input.customer.address || null, comment: input.customer.comment || null,
      totalCents: quote.totalCents, items: { create: quote.snapshots },
    } });
    }, { maxWait: 15000, timeout: 30000 });
    return receipt(order);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const winner = await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (winner) {
        if (winner.requestHash !== requestHash) throw new OrderError('IDEMPOTENCY_CONFLICT');
        return receipt(winner);
      }
    }
    throw error;
  }
}
