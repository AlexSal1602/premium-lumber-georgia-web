// Reports names and paths only; never prints secret values or source lines.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const env = require('dotenv').parse(fs.readFileSync(path.join(root, '.env')));
const sensitive = Object.entries(env).filter(([key, value]) => value && !['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'APP_ORIGIN', 'ORDER_EMAIL_FROM'].includes(key));
for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  if (env[key]) {
    try { const u = new URL(env[key]); if (u.password) sensitive.push([key + '_PASSWORD', decodeURIComponent(u.password)]); } catch {}
  }
}
const findings = [];
let checked = 0;
function scan(dir, browser) {
  if (!fs.existsSync(dir)) return;
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, item.name);
    if (item.isDirectory()) scan(file, browser);
    else if (/\.(?:tsx?|[cm]?js|mjs|json|html|map|css|txt|svg)$/i.test(item.name)) {
      checked++;
      const text = fs.readFileSync(file, 'utf8');
      for (const [key, value] of sensitive) if (value.length >= 8 && text.includes(value)) findings.push({ file: path.relative(root, file), kind: 'configured-secret', key, browser });
      if (/sb_secret_[A-Za-z0-9_-]{12,}/.test(text)) findings.push({ file: path.relative(root, file), kind: 'supabase-secret-key-pattern', browser });
      if (/postgres(?:ql)?:\/\/[^\s"']+:[^\s"']+@/.test(text)) findings.push({ file: path.relative(root, file), kind: 'database-credential-pattern', browser });
      for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
        try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url')).role === 'service_role') findings.push({ file: path.relative(root, file), kind: 'service-role-jwt', browser }); } catch {}
      }
      if (/NEXT_PUBLIC_[A-Z0-9_]*(?:SERVICE|SECRET|DATABASE|PASSWORD|PRIVATE)/.test(text)) findings.push({ file: path.relative(root, file), kind: 'sensitive-public-env-name', browser });
    }
  }
}
scan(path.join(root, 'src'), false);
scan(path.join(root, 'public'), true);
scan(path.join(root, '.next/static'), true);
scan(path.join(root, '.next-production/static'), true);
console.log(JSON.stringify({ checked, configuredEnvironmentNames: Object.keys(env), serviceCredentialEnvironmentNames: Object.keys(env).filter(k => /SERVICE_ROLE|SECRET_KEY/.test(k)), findings }, null, 2));
if (findings.length) process.exitCode = 1;
