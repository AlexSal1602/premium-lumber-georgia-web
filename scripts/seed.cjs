const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { products } = require('../src/lib/catalog/products.ts');
const { categoryLabels } = require('../src/lib/catalog/i18n.ts');
const db = new PrismaClient();
async function main() {
  await db.$transaction(async tx => {
    for (const [id, name] of Object.entries(categoryLabels)) await tx.category.upsert({ where: { id }, update: {}, create: { id, name } });
    for (const p of products) {
      if (await tx.product.findUnique({ where: { id: p.id } })) continue;
      await tx.product.create({ data: { id: p.id, categoryId: p.category, name: p.name, shortDescription: p.shortDescription, description: p.description, images: p.images, species: p.species, grade: p.grade, moisture: p.moisture, units: p.units,
        variants: { create: p.variants.map((v, position) => ({ id: v.id, ...v.dimensions, coverageWidth: v.coverageWidth, priceCents: Math.round(v.price.amount * 100), priceUnit: v.price.unit, status: v.status, position })) } } });
    }
  }, { timeout: 60000 });
  console.log('Demo catalog seeded. Existing products and categories were preserved.');
}
main().catch(e => { let message=String(e.message).replace(/postgres(?:ql)?:[^\s]+/g,'[database URL]'); for(const value of Object.values(process.env)) if(value && value.length>8) message=message.split(value).join('[redacted]'); console.error('Seed failed:', e.code || e.name, message); process.exitCode = 1; }).finally(() => db.$disconnect());
