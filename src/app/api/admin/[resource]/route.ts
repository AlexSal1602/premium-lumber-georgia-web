import { db } from '@/lib/db';
import { requireAdmin, AdminError } from '@/lib/admin/auth';
import { assertOrigin, failure, json, readBody } from '@/lib/admin/http';
import { categorySchema, productSchema, postSchema, orderSchema, slug } from '@/lib/admin/validation';
import { toProduct } from '@/lib/catalog/repository';
import { z } from 'zod';

type Context = { params: Promise<{ resource: string }> };
export async function GET(request: Request, context: Context) {
  try {
    await requireAdmin(); const { resource } = await context.params;
    const query = new URL(request.url).searchParams;
    const page = z.coerce.number().int().min(1).max(100000).parse(query.get('page') || 1);
    const take = 25; const skip = (page - 1) * take;
    if (resource === 'categories') return json({ items: await db.category.findMany({ orderBy: { id: 'asc' } }) });
    if (resource === 'products') {
      const [rows, count] = await Promise.all([db.product.findMany({ skip, take, include: { category: true, variants: { orderBy: { position: 'asc' } } }, orderBy: { createdAt: 'desc' } }), db.product.count()]);
      return json({ items: rows.map(row => ({ ...toProduct(row), name: row.name, shortDescription: row.shortDescription, description: row.description, images: row.images, active: row.active })), count, page });
    }
    if (resource === 'orders') {
      const status = query.get('status'); const where = status ? { status: orderSchema.shape.status.parse(status) } : {};
      const [items, count] = await Promise.all([db.order.findMany({ where, skip, take, include: { items: true }, orderBy: { createdAt: 'desc' } }), db.order.count({ where })]);
      return json({ items, count, page });
    }
    if (resource === 'posts') {
      const [items, count] = await Promise.all([db.post.findMany({ skip, take, orderBy: { createdAt: 'desc' } }), db.post.count()]);
      return json({ items, count, page });
    }
    throw new AdminError(404, 'გვერდი ვერ მოიძებნა.');
  } catch (error) { return failure(error); }
}
export async function POST(request: Request, context: Context) { return save(request, context, false); }
export async function PUT(request: Request, context: Context) { return save(request, context, true); }
async function save(request: Request, context: Context, update: boolean) {
  try {
    assertOrigin(request); await requireAdmin(); const { resource } = await context.params; const input = await readBody(request);
    if (resource === 'products') {
      const p = productSchema.parse(input);
      const data = { categoryId: p.category, name: p.name, shortDescription: p.shortDescription, description: p.description, images: p.images, species: p.species, grade: p.grade, moisture: p.moisture, units: p.units, active: p.active };
      const variants = p.variants.map((v, position) => ({ id: v.id, ...v.dimensions, coverageWidth: v.coverageWidth ?? null, priceCents: Math.round(v.price.amount * 100), priceUnit: v.price.unit, status: v.status, position }));
      await db.$transaction(async tx => {
        if (update) {
          await tx.product.update({ where: { id: p.id }, data });
          await tx.productVariant.deleteMany({ where: { productId: p.id } });
          await tx.productVariant.createMany({ data: variants.map(v => ({ ...v, productId: p.id })) });
        } else await tx.product.create({ data: { id: p.id, ...data, variants: { create: variants } } });
      });
    } else if (resource === 'categories') {
      const p = categorySchema.parse(input);
      if (update) await db.category.update({ where: { id: p.id }, data: { name: p.name } });
      else await db.category.create({ data: p });
    } else if (resource === 'posts') {
      const { id, ...p } = postSchema.parse(input); const data = { ...p, image: p.image || null };
      if (update) { if (!id) throw new AdminError(422, 'კოდი აუცილებელია.'); await db.post.update({ where: { id }, data }); }
      else await db.post.create({ data });
    } else if (resource === 'orders' && update) {
      const p = orderSchema.parse(input);
      const result = await db.order.updateMany({ where: { id: p.id, updatedAt: new Date(p.updatedAt) }, data: { status: p.status, notes: p.notes } });
      if (!result.count) throw new AdminError(409, 'შეკვეთა უკვე შეიცვალა. განაახლეთ სია და სცადეთ ხელახლა.');
    } else throw new AdminError(404, 'გვერდი ვერ მოიძებნა.');
    return json({ ok: true }, update ? 200 : 201);
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request, context: Context) {
  try {
    assertOrigin(request); await requireAdmin(); const { resource } = await context.params;
    const input = z.object({ id: z.string().min(1).max(100) }).strict().parse(await readBody(request));
    if (resource === 'products') await db.product.delete({ where: { id: slug.parse(input.id) } });
    else if (resource === 'categories') await db.category.delete({ where: { id: slug.parse(input.id) } });
    else if (resource === 'posts') await db.post.delete({ where: { id: input.id } });
    else throw new AdminError(405, 'წაშლა დაუშვებელია.');
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
