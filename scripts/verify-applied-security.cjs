// Read-only production checks. Never writes business records, uploads, or emails.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { readProducts } = require('../src/lib/catalog/repository.ts');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: [] });
const root = path.join(__dirname, '..');
const before = JSON.parse(fs.readFileSync(path.join(root, 'security-review/before-approval-metadata.json'), 'utf8'));
async function main() {
  const result = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout='15s'");
    const tables = await tx.$queryRawUnsafe("SELECT relname,relrowsecurity FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' ORDER BY relname");
    assert.equal(tables.length, 10);
    assert.ok(tables.every(t => t.relrowsecurity));
    const privileges = await tx.$queryRawUnsafe(`SELECT r.rolname,c.relname,p.privilege,has_table_privilege(r.oid,c.oid,p.privilege) AS allowed
      FROM pg_roles r CROSS JOIN pg_class c CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE'),('REFERENCES'),('TRIGGER')) p(privilege)
      WHERE r.rolname IN ('anon','authenticated') AND c.relnamespace='public'::regnamespace AND c.relkind='r'`);
    assert.equal(privileges.length, 140);
    assert.ok(privileges.every(p => !p.allowed));
    const columnGrants = await tx.$queryRawUnsafe("SELECT 1 FROM information_schema.column_privileges WHERE table_schema='public' AND grantee IN ('PUBLIC','anon','authenticated')");
    assert.equal(columnGrants.length, 0);
    const policies = await tx.$queryRawUnsafe("SELECT schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname IN ('public','storage') ORDER BY 1,2,3");
    const guards = policies.filter(p => p.schemaname === 'public');
    assert.equal(guards.length, 10);
    assert.ok(guards.every(p => p.policyname === 'gw_block_direct_clients' && p.permissive === 'RESTRICTIVE' && p.cmd === 'ALL' && p.qual === 'false' && p.with_check === 'false' && [...p.roles].sort().join(',') === 'anon,authenticated'));
    assert.deepEqual(policies.filter(p => p.schemaname === 'storage'), before.policies.filter(p => p.schemaname === 'storage'));
    const sequences = await tx.$queryRawUnsafe(`SELECT r.rolname,c.relname,p.privilege,has_sequence_privilege(r.oid,c.oid,p.privilege) AS allowed FROM pg_roles r CROSS JOIN pg_class c CROSS JOIN (VALUES('SELECT'),('USAGE'),('UPDATE')) p(privilege) WHERE r.rolname IN ('anon','authenticated') AND c.relnamespace='public'::regnamespace AND c.relkind='S'`);
    assert.equal(sequences.length, 12);
    assert.ok(sequences.every(p => !p.allowed));
    const functions = await tx.$queryRawUnsafe(`SELECT r.rolname,p.proname,has_function_privilege(r.oid,p.oid,'EXECUTE') AS allowed FROM pg_roles r CROSS JOIN pg_proc p WHERE r.rolname IN ('anon','authenticated') AND p.pronamespace='public'::regnamespace ORDER BY 1,2`);
    assert.equal(functions.length, 4);
    assert.ok(functions.every(p => p.allowed === (p.rolname === 'authenticated' && p.proname === 'gw_is_admin')));
    const defaults = await tx.$queryRawUnsafe(`SELECT pg_get_userbyid(d.defaclrole) AS creator,n.nspname AS schema,d.defaclobjtype AS type,d.defaclacl::text AS acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3`);
    assert.deepEqual(defaults.filter(d => d.creator === 'supabase_admin'), before.defaults.filter(d => d.creator === 'supabase_admin'));
    const unsafeDefaults = await tx.$queryRawUnsafe(`SELECT 1 FROM pg_default_acl d CROSS JOIN LATERAL aclexplode(d.defaclacl) a LEFT JOIN pg_roles r ON r.oid=a.grantee WHERE d.defaclrole='postgres'::regrole AND (d.defaclnamespace=0 OR d.defaclnamespace='public'::regnamespace) AND d.defaclobjtype IN ('r','S','f') AND (a.grantee=0 OR r.rolname IN ('anon','authenticated'))`);
    assert.equal(unsafeDefaults.length, 0);
    const buckets = await tx.$queryRawUnsafe('SELECT id,public,file_size_limit,allowed_mime_types FROM storage.buckets ORDER BY id');
    assert.deepEqual(JSON.parse(JSON.stringify(buckets, (_, v) => typeof v === 'bigint' ? v.toString() : v)), before.buckets);
    const products = await readProducts(tx);
    assert.ok(products.every(p => Array.isArray(p.variants)));
    await tx.category.findMany({ select: { id: true } });
    await tx.post.findMany({ where: { published: true }, select: { id: true } });
    await tx.order.findFirst({ select: { id: true, items: { select: { id: true } }, notification: { select: { status: true } } } });
    await tx.inventoryMovement.findFirst({ select: { id: true } });
    const admin = await tx.adminUser.findFirst({ where: { enabled: true }, select: { id: true } });
    let enabledAdminHelperVerified = false;
    if (admin) {
      await tx.$queryRawUnsafe("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claims',$2,true)", admin.id, JSON.stringify({ sub: admin.id, role: 'authenticated' }));
      await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
      const [helper] = await tx.$queryRawUnsafe('SELECT public.gw_is_admin() AS allowed');
      assert.equal(helper.allowed, true);
      enabledAdminHelperVerified = true;
      await tx.$executeRawUnsafe('SET LOCAL ROLE postgres');
    }
    await tx.$queryRawUnsafe("SELECT set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claims','{}',true)");
    await tx.$executeRawUnsafe('SET LOCAL ROLE authenticated');
    const [outsider] = await tx.$queryRawUnsafe('SELECT public.gw_is_admin() AS allowed');
    assert.equal(outsider.allowed, false);
    await tx.$executeRawUnsafe('SET LOCAL ROLE postgres');
    const server = await tx.$queryRawUnsafe(`SELECT r.rolname,c.relname,p.privilege,has_table_privilege(r.oid,c.oid,p.privilege) AS allowed FROM pg_roles r CROSS JOIN pg_class c CROSS JOIN (VALUES('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege) WHERE r.rolname IN ('postgres','service_role') AND c.relnamespace='public'::regnamespace AND c.relkind='r'`);
    assert.equal(server.length, 80);
    assert.ok(server.every(p => p.allowed));
    return { publicTablesWithRls: tables.length, clientTablePrivilegeChecks: privileges.length, clientSequencePrivilegeChecks: sequences.length, columnGrantsClosed: true, restrictivePolicies: guards.length, unsafePostgresDefaults: 0, storageConfigurationUnchanged: true, serverCatalogAndPrivateReadsPassed: true, serverAndServiceGrantsPreserved: true, enabledAdminHelperVerified, unauthenticatedHelperDenied: true };
  }, { maxWait: 15000, timeout: 60000 });
  const api = [];
  for (const table of ['AdminUser','Category','InventoryMovement','Order','OrderItem','OrderNotification','Post','Product','ProductVariant','_prisma_migrations']) {
    const column = table === '_prisma_migrations' ? 'migration_name' : table === 'OrderNotification' ? 'orderId' : 'id';
    const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}?select=${column}&limit=0`, { method: 'HEAD', headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY }, signal: AbortSignal.timeout(10000) });
    assert.ok([401,403,404].includes(response.status), 'Anonymous Data API access not denied for ' + table);
    api.push({ table, status: response.status });
  }
  const report = { ...result, anonymousApiChecks: api, verifiedAt: new Date().toISOString(), passed: true, businessDataWrites: false };
  fs.writeFileSync(path.join(root, 'security-review/post-deployment-verification.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error('Post-deployment verification failed:', e.code || e.errorCode || e.name); if (e.name === 'AssertionError') console.error(e.message); process.exitCode=1; }).finally(() => db.$disconnect());
