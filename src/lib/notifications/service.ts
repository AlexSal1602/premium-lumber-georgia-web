import { randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { orderEmail } from './template';

export const ORDER_EMAIL_TO = 'premiumlumbergeorgia@gmail.com';
const RETRY_WINDOW = 23 * 60 * 60 * 1000; // Below Resend's 24-hour retention, including clock margin.
type Payload = { from: string; to: string[]; subject: string; html: string; text: string };

// Durable outbox + atomic lease protect concurrent checkout retries/admin requests.
// Freeze the complete payload before I/O: retries must use identical content and sender.
export async function sendOrderNotification(db: PrismaClient, orderId: number, options: { test?: boolean; fetcher?: typeof fetch; now?: Date } = {}) {
  const now = options.now || new Date();
  const token = randomUUID();
  const claimed = await db.orderNotification.updateMany({
    where: { orderId, status: { in: ['PENDING', 'FAILED', 'SENDING'] }, OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }] },
    data: { status: 'SENDING', leaseToken: token, leaseUntil: new Date(now.getTime() + 60_000) },
  });
  if (!claimed.count) return;
  const update = (data: Prisma.OrderNotificationUpdateManyMutationInput) => db.orderNotification.updateMany({ where: { orderId, leaseToken: token }, data });
  try {
    const row = await db.orderNotification.findUniqueOrThrow({ where: { orderId }, include: { order: { include: { items: { orderBy: { id: 'asc' } } } } } });
    if (row.firstAttemptAt && now.getTime() - row.firstAttemptAt.getTime() >= RETRY_WINDOW) {
      await update({ status: 'REVIEW_REQUIRED', lastError: 'RETRY_WINDOW_EXPIRED', leaseUntil: null, leaseToken: null });
      return;
    }
    const key = process.env.RESEND_API_KEY;
    const from = process.env.ORDER_EMAIL_FROM;
    if (!key || !from) {
      await update({ status: 'FAILED', lastError: 'EMAIL_NOT_CONFIGURED', leaseUntil: null, leaseToken: null });
      return;
    }
    const payload = row.payload as Payload | null || { from, to: [ORDER_EMAIL_TO], ...orderEmail(row.order, options.test) };
    const prepared = await update({ payload, firstAttemptAt: row.firstAttemptAt || now, lastAttemptAt: now, attempts: { increment: 1 } });
    if (!prepared.count) return; // Another worker reclaimed an expired lease; do not send.
    const response = await (options.fetcher || fetch)('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'Idempotency-Key': `lumber-order/${row.order.idempotencyKey}` },
      body: JSON.stringify(payload), signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      // Never persist/log provider bodies (may contain customer data or credentials).
      await update({ status: 'FAILED', lastError: `RESEND_HTTP_${response.status}`, leaseUntil: null, leaseToken: null });
      return;
    }
    const result = await response.json() as { id?: string };
    if (!result.id || typeof result.id !== 'string') throw new Error('INVALID_PROVIDER_RESPONSE');
    await update({ status: 'ACCEPTED', providerId: result.id, acceptedAt: now, lastError: null, leaseUntil: null, leaseToken: null });
  } catch {
    // A timeout (or a crash after send) is ambiguous; reuse the same key on retry.
    await update({ status: 'FAILED', lastError: 'SEND_RESULT_UNKNOWN', leaseUntil: null, leaseToken: null });
  }
}

export async function notifySavedOrder(db: PrismaClient, idempotencyKey: string) {
  try {
    const order = await db.order.findUnique({ where: { idempotencyKey }, select: { id: true } });
    if (order) await sendOrderNotification(db, order.id);
  } catch {
    // Order is already committed. A durable PENDING/SENDING row remains retryable.
    console.error('ORDER_NOTIFICATION_DEFERRED');
  }
}
