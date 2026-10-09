// Explicit one-message smoke test. Re-running uses the same order and provider key.
require('dotenv').config();
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { PrismaClient } = require('@prisma/client');
const { sendOrderNotification } = require('../src/lib/notifications/service.ts');
const db = new PrismaClient();
async function main() {
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM) throw new Error('EMAIL_NOT_CONFIGURED');
  const order = await db.order.upsert({
    where: { idempotencyKey: 'c669b9f8-b164-41d7-b076-76e603502de4' }, update: {},
    create: {
      idempotencyKey: 'c669b9f8-b164-41d7-b076-76e603502de4', requestHash: 'resend-integration-smoke-v1',
      status: 'CANCELLED', notes: 'სატესტო ელფოსტა — არ დაამუშაოთ. რეალური გაყიდვა არ არის; ნაშთი არ იცვლება.',
      locale: 'ka', fullName: 'სატესტო მომხმარებელი — არ დაამუშაოთ', phone: '+995000000000',
      email: 'asalbishvili@hotmail.com', city: 'თბილისი (ტესტი)', address: 'სატესტო მისამართი',
      deliveryMethod: 'transport', comment: 'Resend ინტეგრაციის ერთჯერადი შემოწმება. რეალური შეკვეთა არ არის.', totalCents: 1170,
      items: { create: { productId: 'resend-test', variantId: 'resend-test', nameKa: 'სატესტო ფიცარი', nameEn: 'Test board', nameRu: 'Тест', thickness: 25, width: 100, length: 3000, species: 'pine', grade: 'AB', moisture: 'kiln-dried', availability: 'available', unit: 'piece', quantityMilli: 2000, basePriceCents: 78000, basePriceUnit: 'm3', unitPrice: 5.85, totalCents: 1170 } },
      notification: { create: {} },
    },
  });
  await sendOrderNotification(db, order.id, { test: true });
  const result = await db.orderNotification.findUnique({ where: { orderId: order.id }, select: { status: true, attempts: true, providerId: true, lastError: true } });
  console.log(JSON.stringify({ orderNumber: `ORD-${order.id + 1023}`, ...result }));
}
main().catch(() => { console.error('EMAIL_SMOKE_TEST_FAILED (details withheld to protect credentials)'); process.exitCode = 1; }).finally(() => db.$disconnect());
