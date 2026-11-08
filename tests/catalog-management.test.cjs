const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { permanentlyDeleteProduct, deleteCategory } = require('../src/lib/admin/catalog-management.ts');
const { placeOrder } = require('../src/lib/checkout/order-service.ts');
const { products } = require('../src/lib/catalog/products.ts');
const { migrate } = require('./database.cjs');

test('PostgreSQL catalog deletion protects orders, stock, immutable history and concurrent writes', { skip: !process.env.TEST_DATABASE_URL, timeout: 180000 }, async () => {
  const schema = 'gw_catalog_delete_' + randomUUID().replaceAll('-', '');
  const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  const p = products[0];
  async function create(id, extra = {}) {
    return db.product.create({ data: { id, categoryId: 'test-category', name: p.name, shortDescription: p.shortDescription, description: p.description, images: p.images, species: p.species, grade: p.grade, moisture: p.moisture, units: p.units, ...extra, variants: { create: { id: id + '-size', ...p.variants[0].dimensions, priceCents: 1000, priceUnit: 'piece', status: 'available' } } } });
  }
  async function blocked(id, reason) {
    await assert.rejects(permanentlyDeleteProduct(db, id), e => e.code === 'PRODUCT_DELETE_BLOCKED' && e.products[0].reasons.some(r => r.includes(reason)));
    assert.ok(await db.product.findUnique({ where: { id } }));
  }
  try {
    await db.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"'); await migrate(db);
    await db.category.create({ data: { id: 'test-category', name: p.name } });
    await create('hidden', { active: false });
    await assert.rejects(deleteCategory(db, 'test-category'), e => e.code === 'CATEGORY_DELETE_BLOCKED' && e.products[0].id === 'hidden' && e.products[0].active === false);
    // Inventory tracking alone, with zero quantity and no history, must not block deletion.
    await db.productVariant.update({ where: { id: 'hidden-size' }, data: { trackInventory: true } });
    await permanentlyDeleteProduct(db, 'hidden');
    assert.equal(await db.productVariant.count({ where: { productId: 'hidden' } }), 0);
    await create('with-stock');
    await db.productVariant.update({ where: { id: 'with-stock-size' }, data: { stockQuantity: '4' } });
    await blocked('with-stock', '4.000');
    await create('with-history');
    await db.inventoryMovement.create({ data: { id: 'test-movement', productId: 'with-history', variantId: 'with-history-size', type: 'ADJUSTMENT', quantity: 0, beforeQuantity: 0, afterQuantity: 0, stockUnit: 'piece', reason: 'Isolated test' } });
    await blocked('with-history', 'ისტორია');
    await assert.rejects(db.inventoryMovement.delete({ where: { id: 'test-movement' } }));
    await create('with-order');
    const input = id => ({ locale: 'en', idempotencyKey: randomUUID(), customer: { fullName: 'Isolated catalog test', phone: '+995555123456', email: '', city: '', address: '', deliveryMethod: 'pickup', comment: '' }, items: [{ productId: id, variantId: id + '-size', unit: 'piece', quantity: 1 }] });
    await placeOrder(db, input('with-order'));
    await blocked('with-order', 'ORD-');
    // Order snapshots have no FK: even an orphaned variant ID must preserve the product.
    await db.orderItem.updateMany({ where: { productId: 'with-order' }, data: { variantId: 'legacy-size' } });
    await blocked('with-order', 'ORD-');
    await create('race');
    const race = await Promise.allSettled([placeOrder(db, input('race')), permanentlyDeleteProduct(db, 'race')]);
    const remaining = await db.product.findUnique({ where: { id: 'race' } });
    const snapshots = await db.orderItem.count({ where: { productId: 'race' } });
    assert.ok(race.some(r => r.status === 'fulfilled'));
    assert.ok(remaining || snapshots === 0, 'a concurrent order must never reference a deleted product');
    await db.category.create({ data: { id: 'empty', name: p.name } });
    await deleteCategory(db, 'empty');
    assert.equal(await db.category.count({ where: { id: 'empty' } }), 0);
    await assert.rejects(deleteCategory(db, 'missing'), e => e.code === 'CATEGORY_NOT_FOUND' && e.status === 404);
    await assert.rejects(permanentlyDeleteProduct(db, 'missing'), e => e.code === 'PRODUCT_NOT_FOUND' && e.status === 404);
    assert.equal(await db.inventoryMovement.count(), 1);
    assert.ok(await db.order.count() >= 1);
  } finally {
    assert.match(schema, /^gw_catalog_delete_[a-f0-9]{32}$/);
    await db.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE'); await db.$disconnect();
  }
});
