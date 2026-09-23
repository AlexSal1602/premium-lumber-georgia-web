const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { productSchema, categorySchema, postSchema, orderSchema } = require('../src/lib/admin/validation.ts');
const { products } = require('../src/lib/catalog/products.ts');
const { filterProducts, defaultFilters } = require('../src/lib/catalog/logic.ts');
test('product validation enforces bounded prices, dimensions, images and stable variant identifiers', () => {
  const valid = { ...products[0], active: true }; assert.equal(productSchema.safeParse(valid).success, true);
  const invalid = [
    { ...valid, images: [] }, { ...valid, images: [{ ...valid.images[0], src: 'javascript:alert(1)' }] },
    { ...valid, id: '../path' }, { ...valid, units: ['m3'] },
    { ...valid, variants: [valid.variants[0], valid.variants[0]] },
    { ...valid, variants: [{ ...valid.variants[0], price: { ...valid.variants[0].price, amount: 1.001 } }] },
    { ...valid, variants: [{ ...valid.variants[0], coverageWidth: 20000 }] },
    { ...valid, variants: [{ ...valid.variants[0], dimensions: { thickness: 0, width: 100, length: 3000 } }] },
  ];
  for (const value of invalid) assert.equal(productSchema.safeParse(value).success, false);
});
test('new categories participate in search and filters without a hardcoded label', () => {
  const p = { ...products[0], category: 'custom-category', categoryName: { ka: 'ახალი ტიპი', en: 'Custom timber', ru: 'Новая категория' } };
  assert.equal(filterProducts([p], { ...defaultFilters, category: ['custom-category'], query: 'Custom timber' }, 'en').length, 1);
  assert.equal(categorySchema.safeParse({ id: 'custom-category', name: p.categoryName }).success, true);
});
test('orders reject unsupported statuses and require concurrency version; posts require translations', () => {
  const order = { id: 1, status: 'NEW', notes: '', updatedAt: new Date().toISOString() };
  assert.equal(orderSchema.safeParse(order).success, true);
  assert.equal(orderSchema.safeParse({ ...order, status: 'PAID' }).success, false);
  assert.equal(orderSchema.safeParse({ ...order, updatedAt: undefined }).success, false);
  assert.equal(postSchema.safeParse({ slug: 'news', title: { ka: 'მხოლოდ' }, published: false }).success, false);
});

// Exercise the real auth + route code with only network, cookies and DB replaced.
let token; let enabled = true; let userValid = true; let writes = 0;
const originalLoad = Module._load;
const fakeDb = { adminUser: { findUnique: async () => enabled === null ? null : { id: 'admin-id', email: 'admin@example.test', enabled } }, category: { create: async () => { writes++; } }, order: { updateMany: async () => ({ count: 0 }) } };
Module._load = function(id, parent, isMain) {
  if (id === 'next/headers') return { cookies: async () => ({ get: () => token ? { value: token } : undefined }) };
  if (id === '@/lib/db' || (id === '../db' && parent?.filename.endsWith(`${path.sep}admin${path.sep}auth.ts`))) return { db: fakeDb };
  if (id.startsWith('@/')) return originalLoad.call(this, path.join(__dirname, '../src', id.slice(2)), parent, isMain);
  return originalLoad.call(this, id, parent, isMain);
};
process.env.SUPABASE_URL = 'https://supabase.example.test'; process.env.SUPABASE_PUBLISHABLE_KEY = 'test-key';
global.fetch = async () => ({ ok: userValid, json: async () => ({ id: 'admin-id' }) });
const { requireAdmin } = require('../src/lib/admin/auth.ts');
const { POST, PUT, GET } = require('../src/app/api/admin/[resource]/route.ts');
const { assertOrigin } = require('../src/lib/admin/http.ts');
const ctx = resource => ({ params: Promise.resolve({ resource }) });
const request = (body, origin = 'https://shop.example.test', method = 'POST') => new Request('https://shop.example.test/api/admin/categories', { method, headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
test('missing, invalid and non-admin sessions are denied before database writes', async () => {
  token = undefined; await assert.rejects(requireAdmin(), e => e.status === 401);
  assert.equal((await GET(new Request('https://shop.example.test/api/admin/orders'), ctx('orders'))).status, 401);
  token = 'untrusted'; userValid = false; await assert.rejects(requireAdmin(), e => e.status === 401);
  userValid = true; enabled = null; await assert.rejects(requireAdmin(), e => e.status === 403);
  enabled = false; assert.equal((await POST(request({}), ctx('categories'))).status, 403);
  assert.equal(writes, 0);
  enabled = true; assert.equal((await requireAdmin()).admin.id, 'admin-id');
});
test('cross-origin mutation is rejected even with a valid admin session', async () => {
  token = 'valid'; enabled = true;
  assert.throws(() => assertOrigin(request({}, 'https://evil.example')), e => e.status === 403);
  assert.equal((await POST(request({}, 'https://evil.example'), ctx('categories'))).status, 403);
  assert.equal(writes, 0);
});
test('authorized category create succeeds; invalid input cannot reach the database', async () => {
  const valid = { id: 'boards', name: { ka: 'ფიცარი', en: 'Boards', ru: 'Доски' } };
  assert.equal((await POST(request(valid), ctx('categories'))).status, 201);
  assert.equal((await POST(request({ ...valid, id: '../bad' }), ctx('categories'))).status, 422);
  assert.equal(writes, 1);
});
test('stale order revision returns conflict instead of silently overwriting', async () => {
  assert.equal((await PUT(request({ id: 1, status: 'SHIPPED', notes: 'note', updatedAt: new Date().toISOString() }, undefined, 'PUT'), ctx('orders'))).status, 409);
});
