// One-off cleanup of the exact product/category and four historical records
// explicitly confirmed as test data by the user. Not used by the admin API.
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
const productId = '078123', categoryId = 'reik090823';
const variantId = 'size-e4d54eb7-fa3c-4011-9c95-35715b9deac6';
const orderIds = [2, 5];
const movementIds = ['cmuid8hrl0001vv9wgslh8y5r', 'cmuik67n00003vv9wr4lyp8tc'];
const digest = rows => createHash('sha256').update(JSON.stringify(rows)).digest('hex');
async function unaffected(tx) {
  const specs = [
    ['category', { id: { not: categoryId } }, 'id'], ['product', { id: { not: productId } }, 'id'],
    ['productVariant', { id: { not: variantId } }, 'id'], ['order', { id: { notIn: orderIds } }, 'id'],
    ['orderItem', { orderId: { notIn: orderIds } }, 'id'], ['orderNotification', { orderId: { notIn: orderIds } }, 'orderId'],
    ['inventoryMovement', { id: { notIn: movementIds } }, 'id'], ['adminUser', {}, 'id'], ['post', {}, 'id'],
  ];
  const result = {};
  for (const [model, where, key] of specs) {
    const rows = await tx[model].findMany({ where, orderBy: { [key]: 'asc' } });
    result[model] = { count: rows.length, sha256: digest(rows) };
  }
  return result;
}
async function immutableTrigger(tx) {
  const rows = await tx.$queryRaw`SELECT t.tgenabled, pg_get_functiondef(t.tgfoid) AS definition FROM pg_trigger t WHERE t.tgrelid='public."InventoryMovement"'::regclass AND t.tgname='inventory_history_immutable'`;
  assert.equal(rows.length, 1); assert.equal(rows[0].tgenabled, 'O');
  return digest(rows);
}
async function main() {
  assert.ok(process.argv.includes('--apply-confirmed-orders-and-stock'), 'Explicit confirmed-data flag required');
  const backupDirectory = path.join(__dirname, '../outputs/catalog-cleanup-20261109');
  await fs.mkdir(backupDirectory, { recursive: true });
  const result = await db.$transaction(async tx => {
    // Match the order->variant lock order used by stock sales. The product and
    // category locks also prevent edits or new category references during cleanup.
    await tx.$queryRaw`SELECT "id" FROM "Order" WHERE "id" IN (2,5) ORDER BY "id" FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id" = ${productId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "Category" WHERE "id" = ${categoryId} FOR UPDATE`;
    await tx.$queryRaw`SELECT "id" FROM "ProductVariant" WHERE "productId" = ${productId} ORDER BY "id" FOR UPDATE`;
    const product = await tx.product.findUniqueOrThrow({ where: { id: productId }, include: { variants: true } });
    const category = await tx.category.findUniqueOrThrow({ where: { id: categoryId } });
    assert.equal(product.name.ka, 'მაგარი რეიკა'); assert.equal(category.name.ka, 'რეიკა0');
    assert.equal(product.categoryId, categoryId); assert.equal(product.active, false);
    assert.equal(await tx.product.count({ where: { categoryId } }), 1);
    assert.equal(product.variants.length, 1); assert.equal(product.variants[0].id, variantId);
    assert.equal(product.variants[0].stockQuantity.toFixed(3), '4.000'); assert.equal(product.variants[0].inventoryVersion, 2);
    const linkedItems = await tx.orderItem.findMany({ where: { OR: [{ productId }, { variantId }] } });
    assert.deepEqual([...new Set(linkedItems.map(i => i.orderId))].sort((a,b) => a-b), orderIds);
    const orders = await tx.order.findMany({ where: { id: { in: orderIds } }, include: { items: true, notification: true }, orderBy: { id: 'asc' } });
    assert.equal(orders.length, 2);
    for (const order of orders) {
      assert.equal(order.status, 'NEW'); assert.equal(order.inventoryDeductedAt, null); assert.equal(order.inventoryReturnedAt, null);
      assert.ok(order.items.length > 0 && order.items.every(i => i.productId === productId && i.variantId === variantId));
    }
    const movements = await tx.inventoryMovement.findMany({ where: { OR: [{ productId }, { variantId }, { orderId: { in: orderIds } }] }, orderBy: { id: 'asc' } });
    assert.deepEqual(movements.map(m => m.id), [...movementIds].sort());
    assert.equal(movements[0].reason, 'განახლება'); assert.equal(movements[0].quantity.toFixed(3), '5.000');
    assert.equal(movements[1].note, 'გიზომ იყიდა 22.09.2026'); assert.equal(movements[1].quantity.toFixed(3), '-1.000');
    assert.ok(movements.every(m => m.productId === productId && m.variantId === variantId && m.orderId === null));
    const before = await unaffected(tx); const protection = await immutableTrigger(tx);
    const backup = { savedAt: new Date().toISOString(), product, category, orders, movements, unaffected: before, protection };
    // Backup must succeed before any destructive statement. Never overwrite an older backup.
    const backupFile = path.join(backupDirectory, 'confirmed-test-records-' + Date.now() + '.json');
    await fs.writeFile(backupFile, JSON.stringify(backup, null, 2), { flag: 'wx' });
    // ALTER holds an ACCESS EXCLUSIVE table lock until commit. No other session can
    // write history while the trigger is temporarily disabled. DDL rolls back on
    // any failure; the exact original trigger and function remain enabled afterward.
    await tx.$executeRawUnsafe('ALTER TABLE public."InventoryMovement" DISABLE TRIGGER inventory_history_immutable');
    const removedMovements = await tx.inventoryMovement.deleteMany({ where: { id: { in: movementIds }, productId, variantId } });
    assert.equal(removedMovements.count, 2);
    await tx.$executeRawUnsafe('ALTER TABLE public."InventoryMovement" ENABLE TRIGGER inventory_history_immutable');
    assert.equal(await immutableTrigger(tx), protection);
    const removedOrders = await tx.order.deleteMany({ where: { id: { in: orderIds } } }); assert.equal(removedOrders.count, 2);
    await tx.product.delete({ where: { id: productId } });
    await tx.category.delete({ where: { id: categoryId } });
    assert.deepEqual(await unaffected(tx), before, 'Unrelated business records changed; rolling back');
    assert.equal(await tx.productVariant.count({ where: { productId } }), 0);
    assert.equal(await tx.orderItem.count({ where: { OR: [{ productId }, { variantId }, { orderId: { in: orderIds } }] } }), 0);
    return { deleted: { productId, categoryId, variantId, orderNumbers: orderIds.map(id => 'ORD-' + (id + 1023)), movementIds }, otherRecordsUnchanged: before, historyProtectionPreserved: true, backupFile };
  }, { maxWait: 15000, timeout: 60000, isolationLevel: 'Serializable' });
  assert.equal(await db.product.count({ where: { id: productId } }), 0);
  assert.equal(await db.category.count({ where: { id: categoryId } }), 0);
  assert.equal(await db.order.count({ where: { id: { in: orderIds } } }), 0);
  assert.equal(await db.inventoryMovement.count({ where: { OR: [{ productId }, { variantId }] } }), 0);
  await immutableTrigger(db);
  await fs.writeFile(path.join(backupDirectory, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error('Cleanup stopped or rolled back:', e.code || e.name, e instanceof assert.AssertionError ? e.message : ''); process.exitCode = 1; }).finally(() => db.$disconnect());
