const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
require('dotenv').config({ quiet: true });
const { PrismaClient } = require('@prisma/client');
const { products } = require('../src/lib/catalog/products.ts');
const { categoryLabels } = require('../src/lib/catalog/i18n.ts');
const { demoPosts } = require('../src/lib/demo-posts.ts');
const db = new PrismaClient();
// Add missing translations without overwriting editorial content.
const merge = (current, translated) => Object.fromEntries(Object.keys(translated).map(locale => [locale, current?.[locale]?.trim() ? current[locale] : translated[locale]]));
async function main() {
  await db.$transaction(async tx => {
    for (const [id, name] of Object.entries(categoryLabels)) {
      const existing = await tx.category.findUnique({ where: { id } });
      await tx.category.upsert({ where: { id }, update: { name: merge(existing?.name, name) }, create: { id, name } });
    }
    for (const p of products) {
      const existing = await tx.product.findUnique({ where: { id: p.id } });
      if (existing) {
        await tx.product.update({ where: { id: p.id }, data: {
          name: merge(existing.name, p.name), shortDescription: merge(existing.shortDescription, p.shortDescription), description: merge(existing.description, p.description),
          images: existing.images.map((image, i) => ({ ...image, alt: merge(image.alt, p.images[i]?.alt ?? p.name) })),
        } });
        continue;
      }
      await tx.product.create({ data: { id: p.id, categoryId: p.category, name: p.name, shortDescription: p.shortDescription, description: p.description, images: p.images, species: p.species, grade: p.grade, moisture: p.moisture, units: p.units,
        variants: { create: p.variants.map((v, position) => ({ id: v.id, ...v.dimensions, coverageWidth: v.coverageWidth, priceCents: Math.round(v.price.amount * 100), priceUnit: v.price.unit, status: v.status, position })) } } });
    }
    for (const post of demoPosts) {
      const existing = await tx.post.findUnique({ where: { slug: post.slug } });
      await tx.post.upsert({ where: { slug: post.slug }, create: post, update: { title: merge(existing?.title, post.title), excerpt: merge(existing?.excerpt, post.excerpt), body: merge(existing?.body, post.body) } });
    }
  }, { timeout: 60000 });
  console.log('Demo catalog and news seeded in six languages. Existing content was preserved; missing translations were added.');
}
main().catch(e => { let message=String(e.message).replace(/postgres(?:ql)?:[^\s]+/g,'[database URL]'); for(const value of Object.values(process.env)) if(value && value.length>8) message=message.split(value).join('[redacted]'); console.error('Seed failed:', e.code || e.name, message); process.exitCode = 1; }).finally(() => db.$disconnect());
