import { cookies } from 'next/headers';
import { z } from 'zod';
import { AdminError, cookieName, supabaseConfig, verifyAdmin } from '@/lib/admin/auth';
import { assertOrigin, failure, json, readBody } from '@/lib/admin/http';

export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const input = z.object({ email: z.string().email().max(320), password: z.string().min(1).max(256) }).strict().parse(await readBody(request, 4096));
    const { url, key } = supabaseConfig();
    const response = await fetch(`${url}/auth/v1/token?grant_type=password`, { method: 'POST', headers: { apikey: key, 'Content-Type': 'application/json' }, body: JSON.stringify(input), cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new AdminError(response.status === 429 ? 429 : 401, response.status === 429 ? 'ბევრი მცდელობაა. სცადეთ მოგვიანებით.' : 'ელფოსტა ან პაროლი არასწორია.');
    const session = await response.json();
    await verifyAdmin(session.access_token);
    (await cookies()).set(cookieName, session.access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: Math.min(session.expires_in || 3600, 3600) });
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
