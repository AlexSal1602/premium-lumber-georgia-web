const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
// Compile the actual pure TypeScript modules in memory without a test dependency.
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8');
  module._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
};
const { products } = require('../src/lib/catalog/products.ts');
const { defaultFilters, filterProducts, matchingVariants, pricePerUnit, lineTotal, validQuantity, restoreCart, parseFilters, serializeFilters } = require('../src/lib/catalog/logic.ts');

test('mock catalog covers all categories with localized content and unique variants', () => {
  assert.equal(new Set(products.map(p => p.category)).size, 10);
  const ids = products.flatMap(p => p.variants.map(v => v.id));
  assert.equal(ids.length, new Set(ids).size);
  for (const p of products) for (const locale of ['ka', 'en', 'ru', 'uk', 'he', 'ar']) {
    assert.ok(p.name[locale] && p.description[locale] && p.shortDescription[locale]);
    assert.ok(p.images.every(image => image.alt[locale]));
  }
});
test('dimensions must match the same variant, not separate variants', () => {
  const f = { ...defaultFilters, thickness: '25', width: '150', length: '3000' };
  assert.equal(filterProducts(products, f, 'en').length, 0);
  const match = filterProducts(products, { ...f, length: '6000' }, 'en');
  assert.deepEqual(match.map(p => p.id), ['pine-board-ab']);
  assert.equal(matchingVariants(match[0], { ...f, length: '6000' })[0].dimensions.length, 6000);
});
test('filters OR within a group and AND between groups', () => {
  const result = filterProducts(products, { ...defaultFilters, category: ['board', 'beam'], species: ['pine'], grade: ['A', 'AB'], moisture: ['kiln-dried'] }, 'en');
  assert.deepEqual(result.map(p => p.id), ['pine-beam-a']);
});
test('search supports all six languages and product IDs', () => {
  for (const query of ['ფიჭვის კოჭი', 'PINE TIMBER BEAM', 'брус из сосны', 'Сосновий брус', 'קורת אורן', 'عارضة صنوبر', 'pine-beam-a']) {
    assert.ok(filterProducts(products, { ...defaultFilters, query }, 'ka').some(p => p.id === 'pine-beam-a'));
  }
});
test('nominal volume, covered area, and linear metre conversions agree', () => {
  const board = products.find(p => p.id === 'pine-board-ab').variants[0];
  assert.equal(pricePerUnit(board, 'piece'), 5.85); // 780 * .025 * .1 * 3
  assert.ok(Math.abs(pricePerUnit(board, 'm2') - 19.5) < 1e-9);
  assert.equal(lineTotal(board, 'piece', 10), 58.5);
  const lining = products.find(p => p.id === 'spruce-lining-extra').variants[0];
  assert.equal(lineTotal(lining, 'piece', 1), 10.03); // 38 * .088 * 3, not nominal .096
  const batten = products.find(p => p.id === 'pine-batten-ab').variants[0];
  assert.equal(lineTotal(batten, 'piece', 2), 16.8);
});
test('sorting compares a common per-piece basis and honors filtered dimensions', () => {
  const f = { ...defaultFilters, sort: 'price-asc', length: '3000' };
  const prices = filterProducts(products, f, 'en').map(p => pricePerUnit(matchingVariants(p, f)[0], 'piece'));
  assert.deepEqual(prices, [...prices].sort((a,b) => a-b));
  const descending = filterProducts(products, { ...f, sort: 'price-desc' }, 'en').map(p => pricePerUnit(matchingVariants(p, f)[0], 'piece'));
  assert.deepEqual(descending, [...prices].sort((a,b) => b-a));
});
test('quantity validation rejects invalid and fractional piece quantities', () => {
  for (const value of [0, -1, NaN, Infinity, 10001, 1.5]) assert.equal(validQuantity(value, 'piece'), false);
  assert.equal(validQuantity(.001, 'm3'), true);
  assert.equal(validQuantity(.0001, 'm3'), false);
  assert.equal(validQuantity(10000, 'piece'), true);
});
test('persisted cart rejects tampering and merges duplicate lines', () => {
  const product = products[0]; const valid = { productId: product.id, variantId: product.variants[0].id, unit: 'piece', quantity: 2 };
  const restored = restoreCart([valid, { ...valid, price: -999 }, { ...valid, unit: 'fake' }, { ...valid, quantity: -1 }, { ...valid, variantId: 'missing' }, null], products);
  assert.deepEqual(restored, [{ ...valid, quantity: 4 }]);
  const pallet = products.find(p => p.category === 'pallet');
  assert.deepEqual(restoreCart([{ ...valid, productId: pallet.id, variantId: pallet.variants[0].id, unit: 'm3' }], products), []);
  assert.deepEqual(restoreCart({ corrupt: true }, products), []);
});
test('filter URL round trip preserves multilingual search and multiple categories', () => {
  const filters = { ...defaultFilters, query: 'ფიჭვი AB', category: ['board','beam'], thickness: '12.5', sort: 'price-desc' };
  assert.deepEqual(parseFilters(new URLSearchParams(serializeFilters(filters))), filters);
  assert.equal(parseFilters(new URLSearchParams('sort=invalid')).sort, 'name-asc');
});
