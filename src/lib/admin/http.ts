import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AdminError } from './auth';

export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
export function assertOrigin(request: Request) {
  const url = new URL(request.url);
  const expected = process.env.APP_ORIGIN || `${request.headers.get('x-forwarded-proto') === 'https' ? 'https:' : url.protocol}//${request.headers.get('host') ?? url.host}`;
  if (request.headers.get('origin') !== expected) throw new AdminError(403, 'არასწორი მოთხოვნის წყარო.');
}
export async function readBody(request: Request, max = 512 * 1024) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new AdminError(415, 'საჭიროა JSON მოთხოვნა.');
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, 'ცარიელი მოთხოვნა.');
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > max) { await reader.cancel(); throw new AdminError(413, 'მოთხოვნა ზედმეტად დიდია.'); } chunks.push(value); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new AdminError(400, 'არასწორი JSON.'); }
}
export function failure(error: unknown) {
  if (error instanceof AdminError) return json({ error: error.message }, error.status);
  if (error instanceof ZodError) return json({ error: 'შეამოწმეთ ველები.', fields: error.issues.map(i => `${i.path.join('.')}: ${i.message}`) }, 422);
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return json({ error: 'ასეთი კოდი უკვე არსებობს.' }, 409);
    if (error.code === 'P2003') return json({ error: 'კატეგორიას პროდუქტები იყენებს ან მითითებული კატეგორია არ არსებობს.' }, 409);
    if (error.code === 'P2025') return json({ error: 'ჩანაწერი ვერ მოიძებნა.' }, 404);
  }
  return json({ error: 'სერვისი დროებით მიუწვდომელია. სცადეთ ხელახლა.' }, 503);
}
