// GET-only smoke test of the local production build backed by the live database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = 'http://127.0.0.1:3107';
const cases = [
  ['/en/catalog',200],['/en/news',200],['/en/checkout',200],['/api/inventory',200],
  ['/admin/login',200],['/admin',307],['/api/admin/orders',401],['/api/admin/products',401],
  ['/api/admin/categories',401],['/api/admin/posts',401],['/api/admin/inventory',401]
];
(async () => {
  const checks = [];
  for (const [route,status] of cases) {
    const response = await fetch(base + route, { redirect: 'manual', signal: AbortSignal.timeout(45000) });
    assert.equal(response.status,status,route);
    if (route === '/api/inventory') assert.ok(Array.isArray((await response.json()).items));
    else if (status === 200) assert.ok((await response.text()).length > 100);
    if (route === '/admin') assert.equal(response.headers.get('location'),'/admin/login');
    checks.push({ route, status: response.status });
    console.log(`PASS ${response.status} ${route}`);
  }
  fs.writeFileSync(path.join(__dirname,'http-smoke-results.json'),JSON.stringify({ checks, passed:true, methods:['GET'], checkedAt:new Date().toISOString() },null,2)+'\n');
})().catch(e => { console.error('GET-only smoke failed:',e.name,e.message); process.exitCode=1; });
