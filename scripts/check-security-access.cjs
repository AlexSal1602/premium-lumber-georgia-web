// Read-only role simulation and anonymous HTTP probes. No login or mutations.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: [] });
const tables = ['AdminUser','Category','InventoryMovement','Order','OrderItem','OrderNotification','Post','Product','ProductVariant','_prisma_migrations'];
async function main() {
  const report = { roleChecks: [], apiChecks: [], auth: {} };
  report.functionBodies = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const functions = await tx.$queryRawUnsafe(`SELECT p.proname, p.prosrc FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('gw_is_admin','inventory_history_immutable')`);
    const expected = {
      gw_is_admin: 'SELECT EXISTS (SELECT 1 FROM public."AdminUser" WHERE id = (SELECT auth.uid()) AND enabled = true);',
      inventory_history_immutable: "BEGIN RAISE EXCEPTION 'Inventory history is immutable'; END;"
    };
    const normalize = value => value.replace(/\s+/g, ' ').trim();
    return functions.map(f => ({ name: f.proname, matchesCheckedInDefinition: normalize(f.prosrc) === normalize(expected[f.proname]) }));
  });
  for (const role of ['anon','authenticated']) {
    const checks = await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '10s'");
      await tx.$executeRawUnsafe(`SET LOCAL ROLE ${role}`);
      const result = [];
      for (const table of tables) {
        const [permission] = await tx.$queryRawUnsafe(`SELECT has_table_privilege(current_user,'public."${table}"','SELECT') AS can_select`);
        if (!permission.can_select) result.push({ role, table, canSelect: false, rowsVisible: false });
        else {
          const [row] = await tx.$queryRawUnsafe(`SELECT EXISTS(SELECT 1 FROM public."${table}") AS visible`);
          result.push({ role, table, canSelect: true, rowsVisible: row.visible });
        }
      }
      return result;
    }, { maxWait: 15000, timeout: 60000 });
    report.roleChecks.push(...checks);
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  for (const table of tables) {
    const column = table === '_prisma_migrations' ? 'migration_name' : table === 'OrderNotification' ? 'orderId' : 'id';
    const response = await fetch(`${url}/rest/v1/${table}?select=${column}&limit=0`, {
      method: 'HEAD', headers: { apikey: key }, signal: AbortSignal.timeout(10000)
    });
    report.apiChecks.push({ table, status: response.status });
  }
  const response = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: key }, signal: AbortSignal.timeout(10000) });
  if (response.ok) {
    const settings = await response.json();
    report.auth = { disableSignup: settings.disable_signup, emailAutoconfirm: settings.mailer_autoconfirm, anonymousUsersEnabled: settings.external?.anonymous_users ?? settings.anonymous_users_enabled ?? null };
  } else report.auth = { status: response.status };
  fs.mkdirSync(path.join(__dirname, '../security-review'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../security-review/access-checks.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
main().catch(e => { console.error('Read-only access checks failed:', e.code || e.errorCode || e.name); process.exitCode=1; }).finally(() => db.$disconnect());
