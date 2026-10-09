import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orderRequestSchema } from '@/lib/checkout/schema';
import { OrderError, placeOrder } from '@/lib/checkout/order-service';
import { InventoryError } from '@/lib/inventory/service';
import { notifySavedOrder } from '@/lib/notifications/service';

export const runtime = 'nodejs';
const MAX_BYTES = 64 * 1024;
const json = (body: unknown, status: number) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  // Next's internal request URL may use "localhost" even when a browser used 127.0.0.1.
  // Compare against the actual HTTP Host; never trust a caller-supplied forwarded host.
  const url = new URL(request.url);
  const protocol = request.headers.get('x-forwarded-proto') === 'https' ? 'https:' : url.protocol;
  const expectedOrigin = `${protocol}//${request.headers.get('host') ?? url.host}`;
  if (origin && origin !== expectedOrigin) return json({ code: 'INVALID_ORIGIN' }, 403);
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return json({ code: 'INVALID_CONTENT_TYPE' }, 415);
  const reader = request.body?.getReader();
  if (!reader) return json({ code: 'INVALID_REQUEST' }, 400);
  let input: unknown;
  try {
    const chunks: Uint8Array[] = []; let size = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BYTES) { await reader.cancel(); return json({ code: 'REQUEST_TOO_LARGE' }, 413); }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch { return json({ code: 'INVALID_REQUEST' }, 400); }
  const parsed = orderRequestSchema.safeParse(input);
  if (!parsed.success) return json({ code: 'VALIDATION_ERROR', fields: parsed.error.issues.map(issue => issue.path.join('.')) }, 422);
  try {
    const receipt = await placeOrder(db, parsed.data);
    await notifySavedOrder(db, parsed.data.idempotencyKey);
    return json(receipt, 201);
  }
  catch (error) {
    if (error instanceof InventoryError) return json({ code: error.code, issues: error.issues }, 409);
    if (error instanceof OrderError) return json({ code: error.code }, error.code === 'IDEMPOTENCY_CONFLICT' ? 409 : 422);
    // Do not log request bodies, customer details or database connection strings.
    return json({ code: 'ORDER_UNAVAILABLE' }, 503);
  }
}
