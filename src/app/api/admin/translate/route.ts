import { requireAdmin, AdminError } from '@/lib/admin/auth';
import { assertOrigin, failure, json, readBody } from '@/lib/admin/http';
import { translateText, translationRequest } from '@/lib/admin/translate';

export const runtime = 'nodejs';
export const maxDuration = 30;
// Per-process guard; Google project quotas remain the deployment-wide limit.
const requests = new Map<string, { count: number; until: number }>();
export async function POST(request: Request) {
  try {
    assertOrigin(request);
    const { admin } = await requireAdmin();
    const input = translationRequest.parse(await readBody(request, 128 * 1024));
    const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
    if (!key) throw new AdminError(503, 'Google Translate ჯერ არ არის კონფიგურირებული. საჭიროა GOOGLE_TRANSLATE_API_KEY.');
    const now = Date.now();
    for (const [id, entry] of requests) if (entry.until <= now) requests.delete(id);
    const entry = requests.get(admin.id) ?? { count: 0, until: now + 60000 };
    if (entry.count >= 30) throw new AdminError(429, 'ძალიან ბევრი მოთხოვნაა. სცადეთ ერთ წუთში.');
    entry.count++; requests.set(admin.id, entry);
    return json(await translateText(input, key));
  } catch (error) { return failure(error); }
}
