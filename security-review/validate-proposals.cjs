// Isolated in-memory PostgreSQL. Never loads .env or connects to Supabase.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require('./.validation/node_modules/@electric-sql/pglite');
const root = path.join(__dirname, '..');
const tables = ['AdminUser','Category','InventoryMovement','Order','OrderItem','OrderNotification','Post','Product','ProductVariant','_prisma_migrations'];
const adminId = '00000000-0000-4000-8000-000000000001';
const otherId = '00000000-0000-4000-8000-000000000002';
const db = new PGlite();
let assertions = 0;
function check(value, message) { assert.ok(value, message); assertions++; }
async function query(sql, args) { return (await db.query(sql, args)).rows; }
async function denied(sql) {
  await assert.rejects(() => db.query(sql), e => e.code === '42501'); assertions++;
}
async function asRole(role, subject, fn) {
  await db.exec(`SET ROLE ${role}`);
  try {
    await query("SELECT set_config('request.jwt.claim.sub', $1, false)", [subject || '']);
    return await fn();
  } finally { await db.exec('RESET ROLE'); }
}
async function main() {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE SCHEMA storage;
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    GRANT USAGE ON SCHEMA public,auth,storage TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    CREATE TABLE storage.objects(id text PRIMARY KEY,bucket_id text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT ALL ON storage.objects TO authenticated;
  `);
  for (const dir of fs.readdirSync(path.join(root, 'prisma/migrations')).sort()) {
    if (dir === '202610160001_database_security') continue;
    const file = path.join(root, 'prisma/migrations', dir, 'migration.sql');
    if (fs.existsSync(file)) await db.exec(fs.readFileSync(file, 'utf8'));
  }
  await db.exec(`
    CREATE TABLE public._prisma_migrations(id text PRIMARY KEY,migration_name text);
    INSERT INTO public._prisma_migrations VALUES ('fixture','fixture');
    INSERT INTO public."AdminUser"(id,email) VALUES ('${adminId}','admin@example.test');
    INSERT INTO public."Category"(id,name) VALUES ('fixture','{"en":"Fixture"}');
  `);
  await db.exec(fs.readFileSync(path.join(root, 'prisma/supabase-storage.sql'), 'utf8'));
  await asRole('anon', null, async () => check((await query('SELECT * FROM public._prisma_migrations')).length === 1, 'Reproduce migration metadata exposure'));
  for (const file of ['01-table-access.sql','02-functions-and-defaults.sql']) {
    await db.exec(fs.readFileSync(path.join(__dirname, 'proposed', file), 'utf8'));
  }
  check((await query("SELECT count(*)::int AS count FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relrowsecurity")).at(0).count === 10, 'All ten tables have RLS');
  for (const role of ['anon','authenticated']) {
    await asRole(role, role === 'authenticated' ? adminId : null, async () => {
      for (const table of tables) {
        const col = table === 'OrderNotification' ? 'orderId' : 'id';
        await denied(`SELECT 1 FROM public."${table}" LIMIT 0`);
        await denied(`INSERT INTO public."${table}" SELECT * FROM public."${table}" WHERE false`);
        await denied(`UPDATE public."${table}" SET "${col}"="${col}" WHERE false`);
        await denied(`DELETE FROM public."${table}" WHERE false`);
        await denied(`TRUNCATE public."${table}"`);
      }
      for (const sequence of ['Order_id_seq','OrderItem_id_seq']) {
        await denied(`SELECT nextval('public."${sequence}"')`);
        await denied(`SELECT setval('public."${sequence}"',100)`);
      }
      await denied('SELECT public.inventory_history_immutable()');
    });
  }
  await asRole('anon', null, () => denied('SELECT public.gw_is_admin()'));
  // Real existing Storage policy/helper, with a minimal local Auth/Storage fixture.
  await asRole('authenticated', otherId, async () => {
    check(!(await query('SELECT public.gw_is_admin() AS allowed'))[0].allowed, 'Non-admin helper denies');
    await denied("INSERT INTO storage.objects VALUES ('outsider','product-images')");
  });
  await asRole('authenticated', adminId, async () => {
    check((await query('SELECT public.gw_is_admin() AS allowed'))[0].allowed, 'Enabled admin helper allows');
    await db.exec("INSERT INTO storage.objects VALUES ('admin-image','product-images')");
    check((await query('SELECT id FROM storage.objects')).length === 1, 'Admin lists image metadata');
    await db.exec("DELETE FROM storage.objects WHERE id='admin-image'");
    check((await query('SELECT id FROM storage.objects')).length === 0, 'Admin deletes own bucket image');
    await denied("INSERT INTO storage.objects VALUES ('wrong-bucket','private')");
  });
  await db.exec(`UPDATE public."AdminUser" SET enabled=false WHERE id='${adminId}'`);
  await asRole('authenticated', adminId, async () => {
    check(!(await query('SELECT public.gw_is_admin() AS allowed'))[0].allowed, 'Disabled admin helper denies');
    await denied("INSERT INTO storage.objects VALUES ('disabled','product-images')");
  });
  await db.exec(`UPDATE public."AdminUser" SET enabled=true WHERE id='${adminId}'`);
  // Verify restrictive protection even if a later migration adds a permissive policy/grant.
  await db.exec(`GRANT SELECT,INSERT ON public."Category" TO authenticated;
    CREATE POLICY accidental_public ON public."Category" FOR ALL TO authenticated USING(true) WITH CHECK(true);`);
  await asRole('authenticated', otherId, async () => {
    check((await query('SELECT * FROM public."Category"')).length === 0, 'Restrictive guard overrides permissive read');
    await denied(`INSERT INTO public."Category"(id,name) VALUES ('forged','{}')`);
  });
  await db.exec(`DROP POLICY accidental_public ON public."Category"; REVOKE ALL ON public."Category" FROM authenticated;`);
  // Owner checkout transaction, nested records, stock/history and outbox still work.
  await db.exec(`
    BEGIN;
    INSERT INTO public."Product"(id,"categoryId",name,"shortDescription",description,images,species,grade,moisture,units,"updatedAt")
      VALUES ('fixture','fixture','{}','{}','{}','[]','pine','premium','dry',ARRAY['piece'],now());
    INSERT INTO public."ProductVariant"(id,"productId",thickness,width,length,"priceCents","priceUnit",status,"stockQuantity","trackInventory")
      VALUES ('fixture','fixture',20,100,3000,1000,'piece','available',10,true);
    INSERT INTO public."Order"("idempotencyKey","requestHash","updatedAt",locale,"fullName",phone,"deliveryMethod","totalCents")
      VALUES ('fixture','fixture',now(),'en','Fixture Customer','+995555000000','pickup',1000);
    INSERT INTO public."OrderItem"("orderId","productId","variantId","nameKa","nameEn","nameRu",thickness,width,length,species,grade,moisture,availability,unit,"quantityMilli","basePriceCents","basePriceUnit","unitPrice","totalCents")
      VALUES (1,'fixture','fixture','Fixture','Fixture','Fixture',20,100,3000,'pine','premium','dry','available','piece',1000,1000,'piece',10,1000);
    INSERT INTO public."OrderNotification"("orderId") VALUES (1);
    UPDATE public."ProductVariant" SET "stockQuantity"=9,"inventoryVersion"=1 WHERE id='fixture';
    INSERT INTO public."InventoryMovement"(id,"productId","variantId",type,quantity,"beforeQuantity","afterQuantity","stockUnit",reason,"adminId","orderId")
      VALUES ('fixture','fixture','fixture','SALE',-1,10,9,'piece','fixture','${adminId}',1);
    UPDATE public."OrderNotification" SET status='SENDING',"leaseToken"='fixture',attempts=1 WHERE "orderId"=1;
    UPDATE public."OrderNotification" SET status='ACCEPTED',"providerId"='fixture',"leaseToken"=NULL WHERE "orderId"=1;
    UPDATE public."Order" SET status='PROCESSING' WHERE id=1;
    INSERT INTO public."Post"(id,slug,title,excerpt,body,published,"updatedAt") VALUES ('fixture','fixture','{}','{}','{}',true,now());
    COMMIT;
  `);
  check((await query('SELECT count(*)::int AS count FROM public."Order" o JOIN public."OrderItem" i ON i."orderId"=o.id JOIN public."OrderNotification" n ON n."orderId"=o.id WHERE n.status=\'ACCEPTED\''))[0].count === 1, 'Owner checkout/items/outbox transaction preserved');
  check((await query('SELECT "stockQuantity"::text AS quantity FROM public."ProductVariant" WHERE id=\'fixture\''))[0].quantity === '9.000', 'Owner inventory updates preserved');
  await assert.rejects(() => db.exec(`UPDATE public."InventoryMovement" SET note='tamper' WHERE id='fixture'`), /Inventory history is immutable/); assertions++;
  await assert.rejects(() => db.exec(`DELETE FROM public."InventoryMovement" WHERE id='fixture'`), /Inventory history is immutable/); assertions++;
  await asRole('service_role', null, async () => check((await query('SELECT * FROM public."Order"')).length === 1, 'Existing service role remains functional'));
  // Future objects start closed, including global PUBLIC EXECUTE on new functions.
  await db.exec(`CREATE TABLE public.future_fixture(id serial PRIMARY KEY);
    CREATE FUNCTION public.future_fixture_fn() RETURNS int LANGUAGE sql AS 'SELECT 1';`);
  for (const role of ['anon','authenticated']) await asRole(role, null, async () => {
    await denied('SELECT * FROM public.future_fixture');
    await denied("SELECT nextval('public.future_fixture_id_seq')");
    await denied('SELECT public.future_fixture_fn()');
  });
  await db.exec('DROP TABLE public.future_fixture; DROP FUNCTION public.future_fixture_fn();');
  // Idempotent reapplication and deployment bookkeeping owner access.
  for (const file of ['01-table-access.sql','02-functions-and-defaults.sql']) await db.exec(fs.readFileSync(path.join(__dirname, 'proposed', file), 'utf8'));
  await db.exec("INSERT INTO public._prisma_migrations VALUES ('new','approved-security')");
  check((await query('SELECT * FROM public._prisma_migrations')).length === 2, 'Migration bookkeeping remains writable by owner');
  const report = { engine: 'PGlite in-memory PostgreSQL; minimal local Auth/Storage fixtures', assertions, passed: true, productionWrites: false };
  fs.writeFileSync(path.join(__dirname, 'isolated-validation.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error('Isolated validation failed:', e.code || e.name, e.message); process.exitCode=1; }).finally(() => db.close());
