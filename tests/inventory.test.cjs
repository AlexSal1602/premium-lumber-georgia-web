const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { randomUUID } = require('node:crypto');
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, filename);
const { PrismaClient } = require('@prisma/client');
const { changedQuantity, displayQuantity, milli, requiredStock, stockIssues, stockStatus } = require('../src/lib/inventory/quantity.ts');
const { adjustInventory, inventorySchema, orderInventory } = require('../src/lib/inventory/service.ts');
const { inventoryText, stockLabel } = require('../src/lib/inventory/i18n.ts');
const { placeOrder, quoteOrder } = require('../src/lib/checkout/order-service.ts');
const { readProducts } = require('../src/lib/catalog/repository.ts');
const { products } = require('../src/lib/catalog/products.ts');
const { migrate } = require('./database.cjs');
const variant = { ...products[0].variants[0], stockQuantity: '10.000', lowStockThreshold: '2.000', stockUnit: 'piece', trackInventory: true };
test('exact add, subtract, set, precision and nonnegative validation', () => {
  assert.equal(displayQuantity('120.000'), '120');
  assert.equal(displayQuantity('12.340'), '12.34');
  assert.equal(changedQuantity('0.1','add','0.2'), '0.300');
  assert.equal(changedQuantity('10','subtract','2.001'), '7.999');
  assert.equal(changedQuantity('10','set','0'), '0.000');
  assert.equal(changedQuantity('999999999999998','add','1.999'), '999999999999999.999');
  for (const v of ['-1','NaN','Infinity','1e3','1.0001','', '1000000000000000']) assert.throws(() => milli(v));
  assert.throws(() => changedQuantity('1','subtract','1.001'));
  assert.throws(() => changedQuantity('999999999999999.999','add','0.001'));
});
test('low, empty, on-order and legacy statuses; all six languages have complete copy', () => {
  assert.equal(stockStatus(variant),'available');
  assert.equal(stockStatus({ ...variant, stockQuantity:'2' }),'low');
  assert.equal(stockStatus({ ...variant, stockQuantity:'0' }),'out');
  assert.equal(stockStatus({ ...variant, status:'on-order' }),'on-order');
  assert.equal(stockStatus({ ...variant, trackInventory:false }),'on-order');
  assert.equal(stockStatus({ ...variant, trackInventory:false, inventoryConfigured:false }),'legacy');
  for (const locale of ['ka','en','ru','uk','he','ar']) {
    assert.deepEqual(Object.keys(inventoryText[locale]),Object.keys(inventoryText.en));
    assert.ok(Object.values(inventoryText[locale]).every(v => typeof v === 'string' && v.length));
    assert.ok(!stockLabel({ ...variant, trackInventory:false }, locale).includes('10.000'));
  }
});
test('mixed units aggregate per variant, exact conversion rounds up once, stock exceeded is rejected', () => {
  const v = { ...variant, dimensions: { thickness:25,width:100,length:3000 } };
  assert.equal(requiredStock([{ unit:'m3',quantity:0.075 }],v),BigInt(10000));
  assert.equal(requiredStock([{ unit:'lm',quantity:0.001 },{ unit:'lm',quantity:0.002 }],v),BigInt(1));
  const p = { ...products[0], variants:[v] }, base = { productId:p.id,variantId:v.id };
  const lines = [{ ...base,unit:'piece',quantity:1 },{ ...base,unit:'m3',quantity:0.075 }];
  assert.equal(stockIssues(lines,[p])[0].available,'10.000');
  assert.throws(() => quoteOrder(lines,[p]),/INSUFFICIENT_STOCK/);
  assert.equal(stockIssues([{ ...base,unit:'piece',quantity:1 }],[{ ...p,variants:[{ ...v,stockQuantity:'0' }] }]).length,1);
});
test('server validates adjustment fields and movement directions', () => {
  const input = { variantId:variant.id,version:0,action:'add',quantity:'1',type:'RECEIPT',reason:'Delivery',note:'',lowStockThreshold:'2',trackInventory:true };
  assert.ok(inventorySchema.safeParse(input).success);
  for (const change of [{quantity:'-1'},{quantity:1},{version:-1},{reason:''},{adminId:randomUUID()},{type:'SALE'},{lowStockThreshold:'1.0001'}]) assert.equal(inventorySchema.safeParse({ ...input,...change }).success,false);
});

test('PostgreSQL stock transactions, audit, cancellation, idempotency, concurrent writes and rollback', { skip: !process.env.TEST_DATABASE_URL, timeout: 120000 }, async () => {
  const schema = 'gw_inventory_' + randomUUID().replaceAll('-','');
  const url = new URL(process.env.TEST_DATABASE_URL); url.searchParams.set('schema',schema);
  const db = new PrismaClient({ datasources:{ db:{ url:url.toString() } } });
  const adminId = randomUUID(); const p = products[0], v = p.variants[0];
  const input = (quantity, action='set', version=0) => inventorySchema.parse({ variantId:v.id,version,quantity,action,type:'ADJUSTMENT',reason:'Test stock count',note:'Private audit note',lowStockThreshold:'2',trackInventory:true });
  const request = (quantity=2) => ({ locale:'en',idempotencyKey:randomUUID(),customer:{ fullName:'Inventory test',phone:'+995555123456',email:'',city:'',address:'',deliveryMethod:'pickup',comment:'' },items:[{ productId:p.id,variantId:v.id,unit:'piece',quantity }] });
  try {
    await db.$executeRawUnsafe('CREATE SCHEMA "'+schema+'"'); await migrate(db);
    await db.adminUser.create({ data:{ id:adminId,email:'inventory@example.test' } });
    await db.category.create({ data:{ id:p.category,name:p.name } });
    await db.product.create({ data:{ id:p.id,categoryId:p.category,name:p.name,shortDescription:p.shortDescription,description:p.description,images:p.images,species:p.species,grade:p.grade,moisture:p.moisture,units:p.units,variants:{ create:p.variants.map((v,position) => ({ id:v.id,...v.dimensions,priceCents:Math.round(v.price.amount*100),priceUnit:v.price.unit,status:v.status,position })) } } });
    const initial = await db.productVariant.findUnique({where:{id:v.id}});
    assert.equal(initial.trackInventory,false); assert.equal(initial.stockQuantity.toString(),'0');
    await adjustInventory(db,input('10'),adminId);
    await adjustInventory(db,input('0.1','add',1),adminId);
    await adjustInventory(db,input('0.1','subtract',2),adminId);
    let row = await db.productVariant.findUnique({where:{id:v.id}});
    assert.equal(row.stockQuantity.toString(),'10'); assert.equal(row.inventoryVersion,3);
    assert.equal(await db.inventoryMovement.count(),3);
    const audit = await db.inventoryMovement.findFirst({orderBy:{createdAt:'asc'}});
    assert.equal(audit.beforeQuantity.toString(),'0'); assert.equal(audit.afterQuantity.toString(),'10'); assert.equal(audit.adminId,adminId);
    await assert.rejects(adjustInventory(db,input('11','subtract',3),adminId),/INVALID_QUANTITY/);
    await assert.rejects(adjustInventory(db,input('100','set',0),adminId),/CONFLICT/);
    assert.equal(await db.inventoryMovement.count(),3);
    const publicProducts = await readProducts(db); assert.ok(!JSON.stringify(publicProducts).includes('Private audit'));
    await assert.rejects(placeOrder(db,request(11)),/INSUFFICIENT_STOCK/);
    const orderRequest = request(7); await placeOrder(db,orderRequest);
    const order = await db.order.findUnique({where:{idempotencyKey:orderRequest.idempotencyKey}});
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'10');
    const duplicate = await Promise.allSettled([orderInventory(db,order.id,'sell',adminId),orderInventory(db,order.id,'sell',adminId)]);
    assert.equal(duplicate.filter(r=>r.status==='fulfilled').length,1, duplicate.map(r => r.reason?.message || 'ok').join('; '));
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'3');
    assert.equal(await db.inventoryMovement.count({where:{orderId:order.id,type:'SALE'}}),1);
    await assert.rejects(orderInventory(db,order.id,'return',adminId),/CONFLICT/);
    await db.order.update({where:{id:order.id},data:{status:'CANCELLED'}});
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'3');
    await orderInventory(db,order.id,'return',adminId);
    await assert.rejects(orderInventory(db,order.id,'return',adminId),/CONFLICT/);
    await assert.rejects(orderInventory(db,order.id,'sell',adminId),/CONFLICT/);
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'10');
    // Two pending orders may exist, but only one can consume the last seven pieces.
    const a=request(7), b=request(7); await placeOrder(db,a); await placeOrder(db,b);
    const orders = await db.order.findMany({where:{idempotencyKey:{in:[a.idempotencyKey,b.idempotencyKey]}}});
    const results = await Promise.allSettled(orders.map(o=>orderInventory(db,o.id,'sell',adminId)));
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.find(r=>r.status==='rejected').reason.code,'INSUFFICIENT_STOCK');
    row=await db.productVariant.findUnique({where:{id:v.id}});
    const edits=await Promise.allSettled([adjustInventory(db,input('1','add',row.inventoryVersion),adminId),adjustInventory(db,input('1','add',row.inventoryVersion),adminId)]);
    assert.equal(edits.filter(r=>r.status==='fulfilled').length,1);
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'4');
    // A failed audit insert (invalid actor) rolls back the stock update too.
    row=await db.productVariant.findUnique({where:{id:v.id}});
    await assert.rejects(adjustInventory(db,input('100','set',row.inventoryVersion),randomUUID()));
    assert.equal((await db.productVariant.findUnique({where:{id:v.id}})).stockQuantity.toString(),'4');
    await assert.rejects(db.inventoryMovement.delete({where:{id:audit.id}}));
    await assert.rejects(db.productVariant.delete({where:{id:v.id}}));
    const protectedTables=await db.$queryRawUnsafe('SELECT relrowsecurity FROM pg_class WHERE relnamespace=$1::regnamespace AND relname=$2',schema,'InventoryMovement');
    assert.equal(protectedTables[0].relrowsecurity,true);
  } finally { await db.$executeRawUnsafe('DROP SCHEMA "'+schema+'" CASCADE'); await db.$disconnect(); }
});
