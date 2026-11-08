import { Prisma, type PrismaClient } from '@prisma/client';
import { lockVariants } from '../inventory/service';

export type RelatedProduct = { id: string; name: string; active: boolean; reasons: string[] };
export class CatalogDeletionError extends Error {
  constructor(public status: number, public code: string, message: string, public products: RelatedProduct[] = [], public total = products.length) { super(message); }
}
type Tx = Prisma.TransactionClient;
const details = { variants: true } satisfies Prisma.ProductInclude;
type ProductRow = Prisma.ProductGetPayload<{ include: typeof details }>;

async function relatedProduct(tx: Tx, p: ProductRow): Promise<RelatedProduct> {
  const ids = p.variants.map(v => v.id);
  // OrderItem stores immutable identifiers rather than foreign keys. Check both identifiers.
  const [orders, movements] = await Promise.all([
    tx.orderItem.findMany({ where: { OR: [{ productId: p.id }, { variantId: { in: ids } }] }, distinct: ['orderId'], select: { orderId: true } }),
    tx.inventoryMovement.count({ where: { OR: [{ productId: p.id }, { variantId: { in: ids } }] } }),
  ]);
  const name = p.name && typeof p.name === 'object' && !Array.isArray(p.name) && typeof p.name.ka === 'string' ? p.name.ka : p.id;
  const reasons: string[] = [];
  if (orders.length) reasons.push(`დაკავშირებული შეკვეთები: ${orders.map(o => `ORD-${o.orderId + 1023}`).join(', ')}`);
  const stock = p.variants.filter(v => !v.stockQuantity.isZero());
  if (stock.length) reasons.push(`არანულოვანი ნაშთი: ${stock.map(v => `${v.stockQuantity.toFixed(3)} ${v.stockUnit} (${v.id})`).join('; ')}`);
  if (movements) reasons.push(`ნაშთის მოძრაობის ისტორია: ${movements} ჩანაწერი`);
  return { id: p.id, name, active: p.active, reasons };
}

export async function permanentlyDeleteProduct(db: PrismaClient, id: string) {
  return db.$transaction(async tx => {
    // Saving takes the parent lock before its variants; checkout and stock changes
    // use these same variant locks before writing history.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" = ${id} FOR UPDATE`);
    const p = await tx.product.findUnique({ where: { id }, include: details });
    if (!p) throw new CatalogDeletionError(404, 'PRODUCT_NOT_FOUND', 'პროდუქტი ვერ მოიძებნა.');
    await lockVariants(tx, p.variants.map(v => v.id));
    // Re-read stock after acquiring locks: an adjustment may have committed while waiting.
    const current = await tx.product.findUniqueOrThrow({ where: { id }, include: details });
    const product = await relatedProduct(tx, current);
    if (product.reasons.length) throw new CatalogDeletionError(409, 'PRODUCT_DELETE_BLOCKED', 'პროდუქტის სამუდამოდ წაშლა დაბლოკილია. შეკვეთები, ნაშთები და მოძრაობის ისტორია დაცულია. შეგიძლიათ პროდუქტის დამალვა.', [product]);
    await tx.product.delete({ where: { id } });
  }, { maxWait: 15000, timeout: 30000 });
}

export async function deleteCategory(db: PrismaClient, id: string) {
  return db.$transaction(async tx => {
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Category" WHERE "id" = ${id} FOR UPDATE`);
    if (!await tx.category.findUnique({ where: { id }, select: { id: true } })) throw new CatalogDeletionError(404, 'CATEGORY_NOT_FOUND', 'კატეგორია ვერ მოიძებნა.');
    const total = await tx.product.count({ where: { categoryId: id } });
    if (total) {
      const rows = await tx.product.findMany({ where: { categoryId: id }, include: details, orderBy: { id: 'asc' }, take: 100 });
      const products = await Promise.all(rows.map(p => relatedProduct(tx, p)));
      throw new CatalogDeletionError(409, 'CATEGORY_DELETE_BLOCKED', `კატეგორიას უკავშირდება ${total} პროდუქტი, მათ შორის დამალულიც. გადაიტანეთ სხვა კატეგორიაში ან სამუდამოდ წაშალეთ ისტორიის არმქონე პროდუქტი.`, products, total);
    }
    await tx.category.delete({ where: { id } });
  }, { maxWait: 15000, timeout: 30000 });
}
