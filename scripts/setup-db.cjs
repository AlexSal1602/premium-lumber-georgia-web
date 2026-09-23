const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
if (!fs.existsSync(path.join(root, '.env'))) fs.copyFileSync(path.join(root, '.env.example'), path.join(root, '.env'), fs.constants.COPYFILE_EXCL);
require('dotenv').config({ path: path.join(root, '.env'), quiet: true });
if (!/^postgres(ql)?:/.test(process.env.DATABASE_URL || '') || !/^postgres(ql)?:/.test(process.env.DIRECT_URL || '')) {
  console.error('Set DATABASE_URL and DIRECT_URL to PostgreSQL connection strings in .env.'); process.exit(1);
}
for (const args of [['generate'], ['migrate', 'deploy']]) {
  const result = spawnSync(process.execPath, [require.resolve('prisma/build/index.js'), ...args], { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log('Schema ready. Optionally run npm run db:seed for the demo catalog.');
