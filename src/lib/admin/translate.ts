import { z } from 'zod';
import { targetLocales } from './translation-state';

export const translationRequest = z.object({
  text: z.string().trim().min(1).max(20000),
  targets: z.array(z.enum(targetLocales)).min(1).max(5).refine(v => new Set(v).size === v.length),
}).strict();

export async function translateText(input: z.infer<typeof translationRequest>, apiKey: string, request = fetch) {
  const results = await Promise.all(input.targets.map(async locale => {
    try {
      const response = await request('https://translation.googleapis.com/language/translate/v2', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': apiKey },
        body: JSON.stringify({ q: [input.text], source: 'ka', target: locale, format: 'text' }),
        cache: 'no-store', signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) return { locale, error: response.status === 429 ? 'თარგმნის ლიმიტი ამოიწურა. სცადეთ მოგვიანებით.' : response.status === 400 || response.status === 403 ? 'შეამოწმეთ Google Translate-ის გასაღები, API-ის ჩართვა და ბილინგი.' : 'თარგმნა ვერ შესრულდა. სცადეთ ხელახლა.' };
      const body = await response.json();
      const text = body?.data?.translations?.[0]?.translatedText;
      if (typeof text !== 'string' || !text.trim() || text.length > 20000) throw new Error('Invalid translation');
      return { locale, text };
    } catch {
      return { locale, error: 'თარგმნა ვერ დასრულდა. სცადეთ ხელახლა.' };
    }
  }));
  return { results };
}
