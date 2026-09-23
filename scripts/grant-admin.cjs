require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email || !email.includes('@')) throw new Error('USAGE: npm run admin:grant -- admin@example.com');
  const users = await db.$queryRaw`SELECT id::text, email FROM auth.users WHERE lower(email) = ${email} AND email_confirmed_at IS NOT NULL`;
  if (users.length !== 1) throw new Error('Create and confirm this account in Supabase Authentication first.');
  await db.adminUser.upsert({ where: { id: users[0].id }, update: { enabled: true, email }, create: { id: users[0].id, email } });
  console.log('Admin access granted to the confirmed account.');
}
main().catch(e => { console.error(e.code ? `Database error: ${e.code}` : e.message.startsWith('USAGE:') || e.message.startsWith('Create and confirm') ? e.message : 'Admin provisioning failed. Check database connectivity.'); process.exitCode = 1; }).finally(() => db.$disconnect());
