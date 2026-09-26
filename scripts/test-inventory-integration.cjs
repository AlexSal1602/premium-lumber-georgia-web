require('dotenv').config({ quiet: true });
const { spawnSync } = require('node:child_process');
// Both suites create random private schemas and drop only those exact schemas.
// --configured-db explicitly authorizes using the configured server for isolation.
if (!process.env.TEST_DATABASE_URL && process.argv.includes('--configured-db')) process.env.TEST_DATABASE_URL = process.env.DIRECT_URL;
if (!process.env.TEST_DATABASE_URL) { console.error('Set TEST_DATABASE_URL or pass --configured-db.'); process.exit(1); }
const result = spawnSync(process.execPath, ['--test', 'tests/checkout.test.cjs', 'tests/inventory.test.cjs'], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
