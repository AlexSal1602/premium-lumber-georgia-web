const assert = require('node:assert/strict');
const base = process.argv[2] || 'http://localhost:3000';
async function main() {
  const login = await fetch(`${base}/admin/login`);
  assert.equal(login.status, 200); assert.match(await login.text(), /შესვლა/);
  const page = await fetch(`${base}/admin`, { redirect: 'manual' });
  assert.equal(page.status, 307); assert.equal(page.headers.get('location'), '/admin/login');
  for (const resource of ['orders', 'products', 'categories', 'posts']) {
    const response = await fetch(`${base}/api/admin/${resource}`);
    assert.equal(response.status, 401); assert.equal(response.headers.get('cache-control'), 'no-store');
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const write = await fetch(`${base}/api/admin/${resource}`, { method, headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{}' });
      assert.equal(write.status, 401);
    }
  }
  const upload = await fetch(`${base}/api/admin/upload`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'image/png' }, body: 'not-an-image' });
  assert.equal(upload.status, 401);
  const csrf = await fetch(`${base}/api/admin/login`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(csrf.status, 403);
  console.log('Admin HTTP smoke passed: login, redirect, protected reads/writes/upload, no-store, cross-origin rejection.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
