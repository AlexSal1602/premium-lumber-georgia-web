// Applies only the reviewed migration through Prisma's normal migration tracking.
require('dotenv').config({ quiet: true });
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { PrismaClient } = require('@prisma/client');
const root = path.join(__dirname, '..');
const target = '202610160001_database_security';
const tables = ['AdminUser','Category','InventoryMovement','Order','OrderItem','OrderNotification','Post','Product','ProductVariant','_prisma_migrations'].sort();
function projectOf(value) {
  const u = new URL(value);
  const user = decodeURIComponent(u.username);
  const direct = u.hostname.match(/^db\.([^.]+)\.supabase\.co$/);
  return direct?.[1] || (user.startsWith('postgres.') ? user.slice('postgres.'.length) : null);
}
async function preflight(value, label) {
  const db = new PrismaClient({ datasourceUrl: value, log: [] });
  try {
    return await db.$transaction(async tx => {
      await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
      const [role] = await tx.$queryRawUnsafe('SELECT current_user,rolbypassrls FROM pg_roles WHERE rolname=current_user');
      assert.equal(role.current_user, 'postgres', label + ' role differs from reviewed role');
      assert.equal(role.rolbypassrls, true, label + ' must preserve server RLS bypass');
      const actual = await tx.$queryRawUnsafe("SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f') ORDER BY c.relname");
      assert.deepEqual(actual.map(r => r.relname), tables, label + ' relation inventory drift');
      const history = await tx.$queryRawUnsafe('SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public._prisma_migrations ORDER BY migration_name');
      assert.ok(history.every(m => m.finished && !m.rolled_back), label + ' unfinished migration');
      return history;
    }, { maxWait: 15000, timeout: 30000 });
  } finally { await db.$disconnect(); }
}
async function main() {
  const ref = new URL(process.env.SUPABASE_URL).hostname.split('.')[0];
  assert.equal(projectOf(process.env.DATABASE_URL), ref, 'Runtime Supabase project mismatch');
  assert.equal(projectOf(process.env.DIRECT_URL), ref, 'Migration Supabase project mismatch');
  const validation = JSON.parse(fs.readFileSync(path.join(root, 'security-review/isolated-validation.json'), 'utf8'));
  assert.equal(validation.passed, true);
  const expectedBodies = ['01-table-access.sql','02-functions-and-defaults.sql'].map(file => fs.readFileSync(path.join(root, 'security-review/proposed', file), 'utf8')
    .replace(/^-- PROPOSED ONLY[^\r\n]*\r?\n/gm, '').replace(/^-- Promote to a new Prisma migration[^\r\n]*\r?\n/gm, '')
    .replace(/^(BEGIN;|COMMIT;)\r?\n?/gm, '').trim());
  const expected = '-- Approved Supabase public-schema security hardening, 16 October 2026.\nBEGIN;\n\n' + expectedBodies.join('\n\n') + '\n\nCOMMIT;\n';
  const migrationFile = path.join(root, 'prisma/migrations', target, 'migration.sql');
  assert.equal(fs.readFileSync(migrationFile, 'utf8').replace(/\r\n/g, '\n'), expected.replace(/\r\n/g, '\n'), 'Migration differs from approved SQL');
  const runtime = await preflight(process.env.DATABASE_URL, 'Runtime');
  const direct = await preflight(process.env.DIRECT_URL, 'Migration');
  assert.deepEqual(runtime, direct, 'Runtime/migration histories differ');
  const pending = fs.readdirSync(path.join(root, 'prisma/migrations')).filter(name => fs.existsSync(path.join(root, 'prisma/migrations', name, 'migration.sql')) && !runtime.some(m => m.migration_name === name));
  assert.ok(pending.length === 0 || (pending.length === 1 && pending[0] === target), 'Unreviewed pending migrations');
  console.log('Preflight passed: project identity, runtime/migration roles, inventory, histories and approved SQL match.');
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [require.resolve('prisma/build/index.js'), 'migrate', 'deploy'], { cwd: root, env: process.env, stdio: ['ignore','pipe','pipe'] });
    // Suppress raw CLI output: connection errors can embed credentials.
    let output = '';
    child.stdout.on('data', data => { output += data.toString(); });
    child.stderr.on('data', data => { output += data.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) console.error('Prisma migration failed; error codes:', [...new Set(output.match(/\bP\d{4}\b/g) || [])].join(',') || 'unavailable');
      resolve(code);
    });
  });
  assert.equal(exitCode, 0, 'Migration did not complete');
  const after = await preflight(process.env.DIRECT_URL, 'Post-migration');
  assert.ok(after.some(m => m.migration_name === target && m.finished && !m.rolled_back));
  const checksum = require('node:crypto').createHash('sha256').update(fs.readFileSync(migrationFile)).digest('hex');
  assert.equal(after.find(m => m.migration_name === target).checksum, checksum, 'Applied migration checksum mismatch');
  const result = { migration: target, applied: true, migrationChecksum: checksum, completedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(root, 'security-review/deployment-result.json'), JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
main().catch(e => { console.error('Security deployment failed:', e.code || e.errorCode || e.name); process.exitCode=1; });
