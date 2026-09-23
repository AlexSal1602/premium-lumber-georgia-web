const assert = require('node:assert/strict');
const origin = process.argv[2] || 'http://127.0.0.1:3000';
const cases = [
  ['/ka/catalog', 200, 'ka'], ['/en/catalog', 200, 'en'], ['/ru/catalog', 200, 'ru'],
  ['/ka/catalog/pine-board-ab?variant=pine-board-ab-2', 200, 'ka'],
  ['/en/catalog/larch-decking-extra', 200, 'en'], ['/ru/catalog/pine-pallet-b', 200, 'ru'],
  ['/catalog?species=pine', 307, null, '/ka/catalog?species=pine'],
  ['/catalog/pine-beam-a?variant=pine-beam-a-2', 307, null, '/ka/catalog/pine-beam-a?variant=pine-beam-a-2'],
  ['/ka/catalog/missing-product', 404], ['/xx/catalog', 404],
];
(async () => {
  for (const [path, status, locale, location] of cases) {
    const response = await fetch(origin + path, { redirect: 'manual' });
    const body = await response.text();
    assert.equal(response.status, status, path);
    if (locale) assert.match(body, new RegExp(`<html[^>]*lang="${locale}"`), path);
    if (location) assert.equal(response.headers.get('location'), location, path);
    console.log(`PASS ${response.status} ${path}${locale ? ` lang=${locale}` : ''}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
