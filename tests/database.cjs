const fs = require('node:fs');
const path = require('node:path');
exports.migrate = async db => {
  const root = path.join(__dirname, '../prisma/migrations');
  for (const dir of fs.readdirSync(root).sort()) {
    // Public-schema ACLs/roles must never run against public while a test uses a
    // temporary schema. Validate this migration with security-review/validate-proposals.cjs.
    if (dir === '202610160001_database_security') continue;
    const file = path.join(root, dir, 'migration.sql');
    if (!fs.existsSync(file)) continue;
    const sql = fs.readFileSync(file, 'utf8').replace('CREATE SCHEMA IF NOT EXISTS "public";', '').replace(/^BEGIN;|^COMMIT;/gm, '').replace(/--[^\r\n]*/g, '');
    // Migration functions contain semicolons inside PostgreSQL dollar quotes.
    let statement = '', dollar = false;
    for (let i = 0; i < sql.length; i++) {
      if (sql.slice(i, i + 2) === '$$') { dollar = !dollar; statement += '$$'; i++; }
      else if (sql[i] === ';' && !dollar) { if (statement.trim()) await db.$executeRawUnsafe(statement); statement = ''; }
      else statement += sql[i];
    }
    if (statement.trim()) await db.$executeRawUnsafe(statement);
  }
};
