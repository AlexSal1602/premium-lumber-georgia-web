// Metadata only. Never writes SQL, reads customer rows, or prints credentials.
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient({ log: [] });
async function main() {
  const report = await db.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15s'");
    const queries = {
      connection: `SELECT current_user, current_database(), r.rolsuper, r.rolbypassrls FROM pg_roles r WHERE r.rolname = current_user`,
      tables: `SELECT n.nspname AS schema, c.relname AS name, c.relkind, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls, pg_get_userbyid(c.relowner) AS owner, c.reloptions FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_toast%' AND c.relkind IN ('r','p','v','m','f') ORDER BY 1,2`,
      policies: `SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies ORDER BY 1,2,3`,
      grants: `SELECT table_schema, table_name, grantee, privilege_type FROM information_schema.table_privileges WHERE table_schema IN ('public','storage') AND grantee IN ('PUBLIC','anon','authenticated','service_role') ORDER BY 1,2,3,4`,
      columnGrants: `SELECT table_schema, table_name, column_name, grantee, privilege_type FROM information_schema.column_privileges WHERE table_schema='public' AND grantee IN ('PUBLIC','anon','authenticated') AND NOT EXISTS (SELECT 1 FROM information_schema.table_privileges t WHERE t.table_schema=column_privileges.table_schema AND t.table_name=column_privileges.table_name AND t.grantee=column_privileges.grantee AND t.privilege_type=column_privileges.privilege_type) ORDER BY 1,2,3,4`,
      effectiveTableAccess: `SELECT r.rolname AS role, c.relname AS name, has_table_privilege(r.oid,c.oid,'SELECT') AS can_select, has_table_privilege(r.oid,c.oid,'INSERT') AS can_insert, has_table_privilege(r.oid,c.oid,'UPDATE') AS can_update, has_table_privilege(r.oid,c.oid,'DELETE') AS can_delete, has_table_privilege(r.oid,c.oid,'TRUNCATE') AS can_truncate FROM pg_roles r CROSS JOIN pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE r.rolname IN ('anon','authenticated') AND n.nspname='public' AND c.relkind IN ('r','p','v','m') ORDER BY 1,2`,
      functions: `SELECT n.nspname AS schema, p.proname AS name, pg_get_function_identity_arguments(p.oid) AS arguments, p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner, p.proconfig AS config, p.proacl::text AS acl, l.lanname AS language FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='public' ORDER BY 1,2,3`,
      defaults: `SELECT pg_get_userbyid(d.defaclrole) AS creator, n.nspname AS schema, d.defaclobjtype AS type, d.defaclacl::text AS acl FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace ORDER BY 1,2,3`,
      schemas: `SELECT nspname, nspacl::text AS acl FROM pg_namespace WHERE nspname IN ('public','storage','auth')`,
      roleMemberships: `SELECT r.rolname AS role, m.rolname AS member FROM pg_auth_members a JOIN pg_roles r ON r.oid=a.roleid JOIN pg_roles m ON m.oid=a.member ORDER BY 1,2`,
      sequences: `SELECT n.nspname AS schema, c.relname AS name, c.relacl::text AS acl FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='S' ORDER BY 2`,
      buckets: `SELECT id, public, file_size_limit, allowed_mime_types FROM storage.buckets ORDER BY id`,
      publications: `SELECT pubname, schemaname, tablename FROM pg_publication_tables ORDER BY 1,2,3`,
      appliedMigrations: `SELECT migration_name, finished_at IS NOT NULL AS finished, rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY migration_name`
    };
    const output = {};
    for (const [name, sql] of Object.entries(queries)) output[name] = await tx.$queryRawUnsafe(sql);
    return output;
  }, { maxWait: 15000, timeout: 60000 });
  const output = JSON.stringify(report, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
  if (process.argv.includes('--save')) {
    const fs = require('node:fs');
    const path = require('node:path');
    fs.mkdirSync(path.join(__dirname, '../security-review'), { recursive: true });
    fs.writeFileSync(path.join(__dirname, '../security-review/live-metadata.json'), output + '\n');
    console.log('Saved metadata-only security-review/live-metadata.json');
    console.log(JSON.stringify({ connection: report.connection, publicTables: report.tables.filter(t => t.schema === 'public'), policies: report.policies, functions: report.functions, buckets: report.buckets }, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2));
  } else console.log(output);
}
main().catch(e => { console.error('Read-only audit failed:', e.code || e.errorCode || e.name); process.exitCode = 1; }).finally(() => db.$disconnect());
