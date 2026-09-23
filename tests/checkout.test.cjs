const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { PrismaClient } = require('@prisma/client');
const { products } = require('../src/lib/catalog/products.ts');
const { customerSchema, orderRequestSchema } = require('../src/lib/checkout/schema.ts');
const { quoteOrder, placeOrder } = require('../src/lib/checkout/order-service.ts');
const { consumeCart } = require('../src/lib/checkout/cart.ts');

const customer = { fullName: 'Test Customer', phone: '+995 555 01 02 03', email: '', city: '', address: '', deliveryMethod: 'pickup', comment: '' };
const line = { productId: 'pine-board-ab', variantId: 'pine-board-ab-1', unit: 'piece', quantity: 2 };
const request = () => orderRequestSchema.parse({ locale: 'en', idempotencyKey: randomUUID(), customer, items: [line] });

test('customer validation requires phone and full name, with optional email for pickup', () => {
  const schema = customerSchema('en');
  assert.equal(schema.parse(customer).phone, '+995555010203');
  for (const phone of ['', 'abc1234567', '123', '+1234567890123456', '12+3456789']) assert.equal(schema.safeParse({ ...customer, phone }).success, false);
  assert.equal(schema.safeParse({ ...customer, email: 'bad-address' }).success, false);
  assert.equal(schema.safeParse({ ...customer, fullName: ' ' }).success, false);
  assert.equal(schema.safeParse({ ...customer, comment: 'a'.repeat(2001) }).success, false);
});
test('delivery requires city and address, and errors are localized', () => {
  for (const locale of ['ka','en','ru']) {
    const schema = customerSchema(locale);
    assert.equal(schema.safeParse({ ...customer, deliveryMethod: 'transport' }).success, false);
    assert.equal(schema.safeParse({ ...customer, deliveryMethod: 'other', city: 'Tbilisi', address: 'Test street 1' }).success, true);
  }
});
test('server rejects empty cart, fractional pieces, price injection and excessive quantities', () => {
  const input = request();
  for (const items of [[], [{ ...line, quantity: 1.2 }], [{ ...line, quantity: 10001 }], [{ ...line, price: 0 }]]) assert.equal(orderRequestSchema.safeParse({ ...input, items }).success, false);
  assert.equal(orderRequestSchema.safeParse({ ...input, total: 0 }).success, false);
  assert.equal(orderRequestSchema.safeParse({ ...input, idempotencyKey: 'not-a-uuid' }).success, false);
});
test('server prices from catalog and rejects unknown variants, units and duplicates', () => {
  const quote = quoteOrder([line], products);
  assert.equal(quote.totalCents, 1170);
  assert.equal(quote.snapshots[0].quantityMilli, 2000);
  for (const items of [[{ ...line, variantId: 'invalid' }], [line,line], [{ productId: 'pine-pallet-b', variantId: 'pine-pallet-b-1', unit: 'm3', quantity: 1 }]]) assert.throws(() => quoteOrder(items, products), /INVALID_CART/);
});
test('successful submission consumes the submitted snapshot and preserves concurrent additions', () => {
  const another = { ...line, variantId: 'pine-board-ab-2', quantity: 1 };
  assert.deepEqual(consumeCart([{ ...line, quantity: 5 }, another], [line]), [{ ...line, quantity: 3 }, another]);
  assert.deepEqual(consumeCart([line], [line]), []);
});
test('PostgreSQL persistence, snapshots, atomic failure and retry idempotency', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  // Explicit test URL only, with a random isolated schema; never use DATABASE_URL.
  const schema = 'gw_test_' + randomUUID().replaceAll('-', '');
  const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    await db.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    const migration = fs.readFileSync(path.join(__dirname, '../prisma/migrations/202609230002_postgres_admin/migration.sql'), 'utf8').replace('CREATE SCHEMA IF NOT EXISTS "public";', '').replace(/^BEGIN;|^COMMIT;/gm, '');
    for (const statement of migration.split(';').map(s => s.trim()).filter(Boolean)) await db.$executeRawUnsafe(statement);
    const p = products[0];
    await db.category.create({ data: { id: p.category, name: { ka: 'ფიცარი', en: 'Board', ru: 'Доска' } } });
    await db.product.create({ data: { id: p.id, categoryId: p.category, name: p.name, shortDescription: p.shortDescription, description: p.description, images: p.images, species: p.species, grade: p.grade, moisture: p.moisture, units: p.units, variants: { create: p.variants.map((v, position) => ({ id: v.id, ...v.dimensions, priceCents: Math.round(v.price.amount * 100), priceUnit: v.price.unit, status: v.status, position })) } } });
    const input = request();
    const receipt = await placeOrder(db, input);
    assert.equal(receipt.orderNumber, 'ORD-1024'); assert.equal(receipt.status, 'NEW'); assert.equal(receipt.totalCents, 1170);
    await db.$disconnect(); // Prove the row survives a new database connection.
    const stored = await db.order.findFirst({ include: { items: true } });
    assert.equal(stored.status, 'NEW'); assert.equal(stored.phone, '+995555010203'); assert.equal(stored.items[0].quantityMilli, 2000);
    assert.equal(stored.items[0].nameEn, 'Pine sawn board AB'); assert.equal(stored.items[0].totalCents, 1170);
    const repeats = await Promise.all([placeOrder(db, input), placeOrder(db, input)]);
    assert.deepEqual(repeats, [receipt, receipt]); assert.equal(await db.order.count(), 1);
    await assert.rejects(placeOrder(db, { ...input, customer: { ...input.customer, fullName: 'Changed customer' } }), /IDEMPOTENCY_CONFLICT/);
    await assert.rejects(placeOrder(db, { ...input, idempotencyKey: randomUUID(), items: [line, { ...line, variantId: 'missing' }] }), /INVALID_CART/);
    assert.equal(await db.order.count(), 1); assert.equal(await db.orderItem.count(), 1);
    const concurrent = { ...input, idempotencyKey: randomUUID() };
    const results = await Promise.all([placeOrder(db, concurrent), placeOrder(db, concurrent)]);
    assert.deepEqual(results[0], results[1]); assert.equal(await db.order.count(), 2);
    assert.notEqual(results[0].orderNumber, receipt.orderNumber);
    await db.productVariant.update({ where: { id: line.variantId }, data: { priceCents: 100000 } });
    const repriced = await placeOrder(db, { ...input, idempotencyKey: randomUUID() });
    assert.equal(repriced.totalCents, 1500);
    assert.equal((await db.order.findUnique({ where: { idempotencyKey: input.idempotencyKey } })).totalCents, 1170);
    await db.product.update({ where: { id: p.id }, data: { active: false } });
    await assert.rejects(placeOrder(db, { ...input, idempotencyKey: randomUUID() }), /INVALID_CART/);
  } finally { await db.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE'); await db.$disconnect(); }
});
