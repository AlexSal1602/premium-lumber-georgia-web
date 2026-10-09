const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { orderEmail } = require('../src/lib/notifications/template.ts');
const { sendOrderNotification, notifySavedOrder } = require('../src/lib/notifications/service.ts');
const order = { id: 1, idempotencyKey: 'test-order-uuid', createdAt: new Date('2026-10-09T08:00:00Z'), fullName: '<script>alert(1)</script>', phone: '+995555000000', email: 'test@example.com', deliveryMethod: 'transport', city: 'თბილისი', address: 'ტესტი & ქუჩა', comment: 'ტესტი\nმეორე ხაზი', totalCents: 1170, items: [{ id: 1, nameKa: 'ფიცარი <AB>', thickness: 25, width: 100, length: 3000, unit: 'piece', quantityMilli: 2000, unitPrice: 5.85, basePriceCents: 78000, basePriceUnit: 'm3', totalCents: 1170 }] };
function fakeDb() {
  const row = { orderId: 1, order, status: 'PENDING', attempts: 0, firstAttemptAt: null, leaseUntil: null, leaseToken: null, payload: null };
  return { row, order: { findUnique: async () => ({ id: 1 }) }, orderNotification: {
    updateMany: async ({ where, data }) => {
      if (where.leaseToken && where.leaseToken !== row.leaseToken) return { count: 0 };
      if (where.status && (!where.status.in.includes(row.status) || (row.leaseUntil && row.leaseUntil >= where.OR[1].leaseUntil.lt))) return { count: 0 };
      for (const [k,v] of Object.entries(data)) row[k] = k === 'attempts' ? row[k] + v.increment : v;
      return { count: 1 };
    },
    findUniqueOrThrow: async () => ({ ...row }),
  } };
}
process.env.RESEND_API_KEY = 'test-placeholder';
process.env.ORDER_EMAIL_FROM = 'Lumber.ge <orders@lumber.ge>';
test('Georgian text and HTML contain stored order details and escape customer HTML', () => {
  const result = orderEmail(order);
  assert.ok(!result.html.includes('<script>'));
  for (const value of ['ORD-1024', 'თბილისი', '+995555000000', 'test@example.com', '25 × 100 × 3000', '2 ცალი', ...[11.7, 5.85, 780].map(v => v.toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 4 }))]) assert.ok(result.text.includes(value), value);
  assert.ok(result.html.includes('&lt;script&gt;'));
  assert.ok(orderEmail(order, true).subject.startsWith('[სატესტო'));
});
test('concurrent requests and accepted retries result in one provider request', async () => {
  const db = fakeDb(); let sends = 0;
  const fetcher = async (_, req) => { sends++; assert.equal(JSON.parse(req.body).to[0], 'premiumlumbergeorgia@gmail.com'); assert.equal(req.headers['Idempotency-Key'], 'lumber-order/test-order-uuid'); return Response.json({ id: 'email-1' }); };
  await Promise.all([sendOrderNotification(db, 1, { fetcher }), sendOrderNotification(db, 1, { fetcher })]);
  await sendOrderNotification(db, 1, { fetcher });
  assert.equal(sends, 1); assert.equal(db.row.status, 'ACCEPTED'); assert.equal(db.row.providerId, 'email-1');
});
test('timeout retry preserves exact payload and key despite later changes', async () => {
  const db = fakeDb(); const calls = [];
  const fetcher = async (_, req) => { calls.push(req); if (calls.length === 1) throw new Error('timeout secret'); return Response.json({ id: 'email-2' }); };
  await sendOrderNotification(db, 1, { fetcher });
  assert.equal(db.row.status, 'FAILED'); assert.equal(db.row.lastError, 'SEND_RESULT_UNKNOWN');
  const old = process.env.ORDER_EMAIL_FROM; process.env.ORDER_EMAIL_FROM = 'changed@example.com';
  try { await sendOrderNotification(db, 1, { fetcher }); } finally { process.env.ORDER_EMAIL_FROM = old; }
  assert.equal(calls[0].body, calls[1].body); assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
});
test('expired ambiguous attempts are blocked to prevent duplicates after provider retention', async () => {
  const db = fakeDb(); const now = new Date('2026-10-09T12:00:00Z');
  db.row.status = 'SENDING'; db.row.firstAttemptAt = new Date(now.getTime() - 24 * 3600000); db.row.leaseUntil = new Date(now.getTime() - 1000);
  await sendOrderNotification(db, 1, { now, fetcher: async () => { throw new Error('must not send'); } });
  assert.equal(db.row.status, 'REVIEW_REQUIRED'); assert.equal(db.row.attempts, 0);
});
test('missing config and provider rejection record safe failures without sending to customers', async () => {
  const db = fakeDb(); const key = process.env.RESEND_API_KEY; delete process.env.RESEND_API_KEY;
  try { await sendOrderNotification(db, 1); } finally { process.env.RESEND_API_KEY = key; }
  assert.equal(db.row.lastError, 'EMAIL_NOT_CONFIGURED'); assert.equal(db.row.firstAttemptAt, null);
  await sendOrderNotification(db, 1, { fetcher: async () => Response.json({ message: 'private information' }, { status: 429 }) });
  assert.equal(db.row.lastError, 'RESEND_HTTP_429'); assert.equal(db.row.status, 'FAILED');
});
test('database notification outage never bubbles into committed checkout', async () => {
  const db = fakeDb(); db.order.findUnique = async () => { throw new Error('database down'); };
  await assert.doesNotReject(notifySavedOrder(db, 'test-order-uuid'));
});

test('PostgreSQL outbox lease concurrency and durable acceptance', { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const { PrismaClient } = require('@prisma/client');
  const { randomUUID } = require('node:crypto');
  const schema = 'gw_email_test_' + randomUUID().replaceAll('-', '');
  const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set('schema', schema);
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } } });
  try {
    await db.$executeRawUnsafe('CREATE SCHEMA "' + schema + '"');
    await require('./database.cjs').migrate(db);
    const saved = await db.order.create({ data: { idempotencyKey: randomUUID(), requestHash: 'test', locale: 'ka', fullName: 'სატესტო', phone: '+995555000000', deliveryMethod: 'pickup', totalCents: 100, notification: { create: {} } } });
    let calls = 0;
    const fetcher = async () => { calls++; return Response.json({ id: 'test-provider-id' }); };
    await Promise.all(Array.from({ length: 5 }, () => sendOrderNotification(db, saved.id, { fetcher })));
    await db.$disconnect();
    await sendOrderNotification(db, saved.id, { fetcher });
    assert.equal(calls, 1);
    const row = await db.orderNotification.findUnique({ where: { orderId: saved.id } });
    assert.equal(row.status, 'ACCEPTED'); assert.equal(row.attempts, 1);
  } finally {
    await db.$executeRawUnsafe('DROP SCHEMA "' + schema + '" CASCADE');
    await db.$disconnect();
  }
});
