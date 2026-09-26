const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { locales, direction, languagePath } = require('../src/lib/locales.ts');
const { dictionaries } = require('../src/lib/site.ts');
const { catalogText, categoryLabels, speciesLabels, moistureLabels, unitLabels, money } = require('../src/lib/catalog/i18n.ts');
const { checkoutText } = require('../src/lib/checkout/i18n.ts');
const { products } = require('../src/lib/catalog/products.ts');
const { demoPosts } = require('../src/lib/demo-posts.ts');
const { localized } = require('../src/lib/localized.ts');
const { orderRequestSchema } = require('../src/lib/checkout/schema.ts');
const { productSchema } = require('../src/lib/admin/validation.ts');
function sameShape(actual, reference) {
 assert.deepEqual(Object.keys(actual).sort(), Object.keys(reference).sort());
 for (const key of Object.keys(reference)) {
  if (typeof reference[key] === 'string') assert.ok(typeof actual[key] === 'string' && actual[key].trim(), key);
  else sameShape(actual[key], reference[key]);
 }
}
test('all six languages have complete interface dictionaries and demo data', () => {
 assert.deepEqual(locales, ['ka', 'en', 'ru', 'uk', 'he', 'ar']);
 for (const locale of locales) {
  for (const dictionary of [dictionaries, catalogText, checkoutText]) sameShape(dictionary[locale], dictionary.en);
  for (const labels of [categoryLabels, speciesLabels, moistureLabels, unitLabels]) for (const entry of Object.values(labels)) assert.ok(entry[locale]);
  for (const product of products) for (const field of [product.name, product.description, product.shortDescription, ...product.images.map(image => image.alt)]) assert.ok(field[locale]);
  for (const post of demoPosts) for (const field of [post.title, post.excerpt, post.body]) assert.ok(field[locale]);
  assert.equal(direction(locale), ['he', 'ar'].includes(locale) ? 'rtl' : 'ltr');
  assert.ok(money(1234.56, locale));
 }
});
test('language changes preserve the complete nested path, query, and hash', () => {
 for (const from of locales) for (const to of locales) {
  assert.equal(languagePath(`/${from}/news/example?tag=a&tag=b#details`, to), `/${to}/news/example?tag=a&tag=b#details`);
  assert.equal(languagePath(`/${from}/catalog/pine-board-ab?variant=size-1#gallery`, to), `/${to}/catalog/pine-board-ab?variant=size-1#gallery`);
 }
 assert.equal(languagePath('/catalog', 'ar'), '/ar/catalog');
});
test('orders accept new languages and reject unknown ones; admin requires every translation', () => {
 for (const locale of locales) assert.equal(orderRequestSchema.shape.locale.safeParse(locale).success, true);
 assert.equal(orderRequestSchema.shape.locale.safeParse('xx').success, false);
 const product = { ...products[0], active: true };
 assert.equal(productSchema.safeParse(product).success, true);
 assert.equal(productSchema.safeParse({ ...product, name: { ...product.name, he: '' } }).success, false);
});
test('legacy data uses translated defaults without replacing existing editorial text', () => {
 const result = localized({ ka: 'ძველი', en: 'Original', uk: 'Власний текст' }, products[0].name);
 assert.equal(result.en, 'Original'); assert.equal(result.uk, 'Власний текст'); assert.equal(result.he, products[0].name.he);
 assert.equal(localized({ en: 'Legacy' }).ar, 'Legacy');
});
