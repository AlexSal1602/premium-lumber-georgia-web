import { cookies } from 'next/headers';
import { cookieName, supabaseConfig } from '@/lib/admin/auth';
import { assertOrigin, failure, json } from '@/lib/admin/http';
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const jar = await cookies(); const token = jar.get(cookieName)?.value;
    jar.delete(cookieName);
    if (token) {
      const { url, key } = supabaseConfig();
      await fetch(`${url}/auth/v1/logout`, { method: 'POST', headers: { apikey: key, Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(10000) }).catch(() => {});
    }
    return json({ ok: true });
  } catch (error) { return failure(error); }
}
