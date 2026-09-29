const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { translateText, translationRequest } = require('../src/lib/admin/translate.ts');
const { acceptTranslation, changeSource, targetLocales, translationStatus } = require('../src/lib/admin/translation-state.ts');
const { productSchema, postSchema, categorySchema } = require('../src/lib/admin/validation.ts');
const { products } = require('../src/lib/catalog/products.ts');
const { localized } = require('../src/lib/localized.ts');
const blank = { ka: 'ქართული ტექსტი', en: '', ru: '', uk: '', he: '', ar: '' };

test('Georgian drafts are allowed but incomplete published content and categories are rejected', () => {
  const product = { ...products[0], active: false, name: blank };
  assert.equal(productSchema.safeParse(product).success, true);
  assert.equal(productSchema.safeParse({ ...product, active: true }).success, false);
  const post = { slug: 'test', title: blank, excerpt: blank, body: blank, image: '', published: false };
  assert.equal(postSchema.safeParse(post).success, true);
  assert.equal(postSchema.safeParse({ ...post, published: true }).success, false);
  assert.equal(categorySchema.safeParse({ id: 'test', name: blank }).success, false);
});

test('source changes survive save/reopen, require review, and never erase editorial text', () => {
  let value = { ...products[0].name };
  value = changeSource(value, 'შეცვლილი დასახელება');
  value = JSON.parse(JSON.stringify(value));
  assert.equal(value.en, products[0].name.en);
  assert.equal(translationStatus(value, 'en'), 'stale');
  assert.equal(categorySchema.safeParse({ id: 'test', name: value }).success, false);
  for (const locale of targetLocales) value = acceptTranslation(value, locale, value[locale]);
  const parsed = categorySchema.parse({ id: 'test', name: value });
  assert.equal(translationStatus(parsed.name, 'en'), 'ready');
  assert.equal(Object.keys(localized(parsed.name)).length, 6);
  assert.equal(localized(parsed.name).en, products[0].name.en);
  assert.equal(translationStatus(changeSource(value, `  ${value.ka}  `), 'en'), 'ready');
  assert.equal(translationStatus(changeSource(value, 'სხვა ტექსტი'), 'en'), 'stale');
});

test('translation requests reject unbounded text, unknown/duplicate targets and injected parameters', () => {
  assert.equal(translationRequest.safeParse({ text: 'ტექსტი', targets: targetLocales }).success, true);
  for (const input of [ { text: '', targets: ['en'] }, { text: 'ა'.repeat(20001), targets: ['en'] }, { text: 'ა', targets: ['ka'] }, { text: 'ა', targets: ['en', 'en'] }, { text: 'ა', targets: [] }, { text: 'ა', targets: ['en'], key: 'bad' } ]) assert.equal(translationRequest.safeParse(input).success, false);
});

test('provider calls use Georgian/plain text, keep keys out of URLs/results, and isolate failures', async () => {
  const calls = [];
  const mock = async (url, options) => {
    const body = JSON.parse(options.body); calls.push(body.target);
    assert.equal(url, 'https://translation.googleapis.com/language/translate/v2');
    assert.equal(options.headers['X-Goog-Api-Key'], 'secret-key');
    assert.equal(body.source, 'ka'); assert.equal(body.format, 'text');
    assert.deepEqual(body.q, ['ტექსტი']);
    if (body.target === 'ru') return { ok: false, status: 429 };
    if (body.target === 'uk') throw new Error('network secret-key');
    return { ok: true, json: async () => ({ data: { translations: [{ translatedText: `Translated ${body.target}` }] } }) };
  };
  const result = await translateText({ text: 'ტექსტი', targets: [...targetLocales] }, 'secret-key', mock);
  assert.equal(result.results.filter(item => item.text).length, 3);
  assert.equal(result.results.filter(item => item.error).length, 2);
  assert.equal(JSON.stringify(result).includes('secret-key'), false);
  calls.length = 0;
  await translateText({ text: 'ტექსტი', targets: ['ru'] }, 'secret-key', mock);
  assert.deepEqual(calls, ['ru']);
});

test('malformed, empty, overlong and forbidden provider responses remain per-language failures', async () => {
  for (const response of [ { ok: false, status: 403 }, { ok: true, json: async () => ({}) }, { ok: true, json: async () => ({ data: { translations: [{ translatedText: '' }] } }) }, { ok: true, json: async () => ({ data: { translations: [{ translatedText: 'x'.repeat(20001) }] } }) } ]) {
    const result = await translateText({ text: 'ტექსტი', targets: ['en'] }, 'secret-key', async () => response);
    assert.equal(typeof result.results[0].error, 'string');
    assert.equal(result.results[0].text, undefined);
  }
});
