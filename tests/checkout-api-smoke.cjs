const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const origin = process.argv[2] || 'http://127.0.0.1:3001';
const customer = { fullName: 'HTTP TEST CUSTOMER', phone: '+995555000000', email: '', city: '', address: '', deliveryMethod: 'pickup', comment: 'AUTOMATED TEST — not a fulfillment request' };
const input = { locale: 'en', idempotencyKey: randomUUID(), customer, items: [{ productId: 'pine-board-ab', variantId: 'pine-board-ab-1', unit: 'piece', quantity: 2 }] };
async function post(body, headers = {}) {
  const response = await fetch(`${origin}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, ...headers }, body: JSON.stringify(body) });
  return { status: response.status, body: await response.json() };
}
(async () => {
  for (const locale of ['ka', 'en', 'ru']) {
    const response = await fetch(`${origin}/${locale}/checkout`); assert.equal(response.status, 200);
    assert.match(await response.text(), new RegExp(`<html[^>]*lang="${locale}"`));
  }
  console.log('PASS localized checkout routes');
  const alias = await fetch(`${origin}/checkout`, { redirect: 'manual' }); assert.equal(alias.status, 307); assert.equal(alias.headers.get('location'), '/ka/checkout');
  const successPage = await fetch(`${origin}/en/checkout/success`); assert.equal(successPage.status, 200);
  console.log('PASS checkout redirect and success route');
  assert.equal((await post({ ...input, items: [] })).status, 422);
  assert.equal((await post({ ...input, customer: { ...customer, phone: '' } })).status, 422);
  assert.equal((await post({ ...input, customer: { ...customer, deliveryMethod: 'transport' } })).status, 422);
  assert.equal((await post({ ...input, items: [{ ...input.items[0], quantity: 1.5 }] })).status, 422);
  assert.equal((await post({ ...input, items: [{ ...input.items[0], variantId: 'missing' }] })).status, 422);
  assert.equal((await post({ ...input, totalCents: 1 })).status, 422);
  assert.equal((await post(input, { Origin: 'https://untrusted.example' })).status, 403);
  assert.equal((await post(input, { 'Content-Type': 'text/plain' })).status, 415);
  const malformed = await fetch(`${origin}/api/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' }); assert.equal(malformed.status, 400);
  const oversized = await post({ ...input, extra: 'a'.repeat(70000) }); assert.equal(oversized.status, 413);
  console.log('PASS invalid customer/cart, price injection, origin, JSON and size checks');
  const first = await post(input); assert.equal(first.status, 201); assert.match(first.body.orderNumber, /^ORD-\d+$/); assert.equal(first.body.status, 'NEW'); assert.equal(first.body.totalCents, 1170);
  assert.deepEqual(Object.keys(first.body).sort(), ['currency', 'orderNumber', 'status', 'totalCents']);
  const again = await post(input); assert.deepEqual(again.body, first.body);
  assert.equal((await post({ ...input, customer: { ...customer, fullName: 'Different test customer' } })).status, 409);
  const parallelInput = { ...input, idempotencyKey: randomUUID() };
  const parallel = await Promise.all([post(parallelInput), post(parallelInput)]);
  assert.equal(parallel[0].status, 201); assert.equal(parallel[1].status, 201); assert.deepEqual(parallel[0].body, parallel[1].body);
  assert.notEqual(parallel[0].body.orderNumber, first.body.orderNumber);
  console.log('PASS persisted receipts, idempotent retry, conflict and concurrent request');
  assert.equal((await fetch(`${origin}/api/orders`)).status, 405);
  console.log('PASS no public order-list endpoint');
})().catch(error => { console.error(error); process.exitCode = 1; });
