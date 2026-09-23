import { randomUUID } from 'node:crypto';
import { requireAdmin, supabaseConfig, AdminError } from '@/lib/admin/auth';
import { assertOrigin, failure, json } from '@/lib/admin/http';

export async function POST(request: Request) {
  try {
    assertOrigin(request); const { token } = await requireAdmin();
    const type = request.headers.get('content-type')?.split(';')[0];
    const ext = type === 'image/jpeg' ? 'jpg' : type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : null;
    if (!ext) throw new AdminError(415, 'აირჩიეთ JPG, PNG ან WebP ფოტო.');
    const reader = request.body?.getReader(); if (!reader) throw new AdminError(400, 'აირჩიეთ ფოტო.');
    let length = 0; const chunks: Uint8Array[] = [];
    while (true) { const { done, value } = await reader.read(); if (done) break; length += value.length; if (length > 5 * 1024 * 1024) { await reader.cancel(); throw new AdminError(413, 'ფოტოს მაქსიმალური ზომაა 5 MB.'); } chunks.push(value); }
    const bytes = Buffer.concat(chunks);
    const valid = ext === 'jpg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : ext === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) throw new AdminError(422, 'ფაილის შიგთავსი არ ემთხვევა ფოტოს ფორმატს.');
    const { url, key } = supabaseConfig(); const path = `catalog/${randomUUID()}.${ext}`;
    const response = await fetch(`${url}/storage/v1/object/product-images/${path}`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': type! }, body: new Uint8Array(bytes), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new AdminError(503, 'ატვირთვა ვერ შესრულდა. შეამოწმეთ Storage-ის კონფიგურაცია.');
    return json({ url: `${url}/storage/v1/object/public/product-images/${path}` }, 201);
  } catch (error) { return failure(error); }
}
