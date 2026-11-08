require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
(async () => {
  const categories = await db.category.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, createdAt: true } });
  const products = await db.product.findMany({ orderBy: { createdAt: 'desc' }, include: { variants: true, _count: { select: { movements: true } } } });
  const result = [];
  for (const p of products) {
    const orderItems = await db.orderItem.findMany({ where: { OR: [{ productId: p.id }, { variantId: { in: p.variants.map(v => v.id) } }] }, select: { orderId: true, productId: true, variantId: true, nameKa: true, order: { select: { status: true, notes: true, comment: true, createdAt: true } } } });
    const movements = await db.inventoryMovement.findMany({ where: { OR: [{ productId: p.id }, { variantId: { in: p.variants.map(v => v.id) } }] }, select: { id: true, type: true, quantity: true, beforeQuantity: true, afterQuantity: true, reason: true, note: true, orderId: true, variantId: true } });
    result.push({ id: p.id, name: p.name, categoryId: p.categoryId, active: p.active, createdAt: p.createdAt, variants: p.variants.map(v => ({ id: v.id, stockQuantity: v.stockQuantity.toFixed(3), trackInventory: v.trackInventory, inventoryVersion: v.inventoryVersion })), orderItems, movements });
  }
  const linkedOrders = await db.order.findMany({ where: { items: { some: { productId: '078123' } } }, select: { id: true, fullName: true, comment: true, notes: true, status: true, idempotencyKey: true, inventoryDeductedAt: true, inventoryReturnedAt: true, items: { select: { productId: true, variantId: true, nameKa: true, quantityMilli: true } } } });
  console.log(JSON.stringify(process.argv.includes('--linked-orders') ? { linkedOrders } : { origin: process.env.APP_ORIGIN, categories, products: result }, null, 2));
})().catch(e => { console.error(e.code || e.name); process.exitCode = 1; }).finally(() => db.$disconnect());
