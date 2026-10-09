import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin/auth';
import { assertOrigin, failure, json, readBody } from '@/lib/admin/http';
import { sendOrderNotification } from '@/lib/notifications/service';

export const runtime = 'nodejs';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    await requireAdmin();
    const { id } = z.object({ id: z.number().int().positive() }).strict().parse(await readBody(request, 1024));
    await sendOrderNotification(db, id);
    const result = await db.orderNotification.findUnique({ where: { orderId: id }, select: { status: true, lastError: true } });
    return json({ notification: result });
  } catch (error) { return failure(error); }
}
