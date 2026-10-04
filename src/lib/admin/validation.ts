import { z } from 'zod';
import { targetLocales, translationStatus, type TranslationValue } from './translation-state';

export const localized = z.object({ ka: z.string().trim().min(1).max(20000), en: z.string().trim().max(20000).default(''), ru: z.string().trim().max(20000).default(''), uk: z.string().trim().max(20000).default(''), he: z.string().trim().max(20000).default(''), ar: z.string().trim().max(20000).default(''), _sources: z.object({ en: z.string().max(64).optional(), ru: z.string().max(64).optional(), uk: z.string().max(64).optional(), he: z.string().max(64).optional(), ar: z.string().max(64).optional() }).strict().optional() }).strict();
function completeTranslations(value: TranslationValue, path: (string | number)[], ctx: z.RefinementCtx) {
  for (const locale of targetLocales) if (translationStatus(value, locale) !== 'ready') ctx.addIssue({ code: z.ZodIssueCode.custom, path: [...path, locale], message: 'გამოქვეყნებამდე შეავსეთ ან გადაამოწმეთ თარგმანი.' });
}
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const imageUrl = z.string().url().max(2048).refine(value => { try { return new URL(value).protocol === 'https:'; } catch { return false; } }, 'ფოტოს მისამართი უნდა იწყებოდეს https://-ით');
export const units = z.enum(['m3', 'm2', 'lm', 'piece']);
const variant = z.object({
  id: slug, dimensions: z.object({ thickness: z.number().positive().max(10000), width: z.number().positive().max(10000), length: z.number().positive().max(100000) }).strict(),
  coverageWidth: z.number().positive().optional(),
  price: z.object({ amount: z.number().positive().max(10000000).refine(v => Math.abs(v * 100 - Math.round(v * 100)) < 0.00001), currency: z.literal('GEL'), unit: units }).strict(),
  status: z.enum(['available', 'on-order']),
}).strict().refine(v => !v.coverageWidth || v.coverageWidth <= v.dimensions.width, 'დაფარვის სიგანე აღემატება დაფის სიგანეს');
export const productSchema = z.object({
  id: slug, category: slug, name: localized, shortDescription: localized, description: localized,
  images: z.array(z.object({ src: imageUrl, alt: localized }).strict()).min(1).max(12),
  species: z.enum(['pine','spruce','larch','oak','red-oak','ash','beech','linden','alder','maple']), grade: z.enum(['premium','A','B','C','AB','ABC','BC']), moisture: z.enum(['green','air-dried','kiln-dried','thermo']),
  units: z.array(units).min(1).max(4).refine(v => new Set(v).size === v.length && v.includes('piece'), 'აუცილებელია ერთეული: ცალი'),
  active: z.boolean(), variants: z.array(variant).min(1).max(50),
}).strict().refine(p => new Set(p.variants.map(v => v.id)).size === p.variants.length, 'ზომების კოდები უნდა იყოს უნიკალური')
  .refine(p => p.variants.every(v => p.units.includes(v.price.unit)), 'ფასის ერთეული უნდა იყოს დაშვებული')
  .superRefine((p, ctx) => { if (p.active) { for (const field of ['name', 'shortDescription', 'description'] as const) completeTranslations(p[field], [field], ctx); p.images.forEach((image, i) => completeTranslations(image.alt, ['images', i, 'alt'], ctx)); } });
export const categorySchema = z.object({ id: slug, name: localized }).strict().superRefine((p, ctx) => completeTranslations(p.name, ['name'], ctx));
export const postSchema = z.object({ id: z.string().max(100).optional(), slug, title: localized, excerpt: localized, body: localized, image: imageUrl.or(z.literal('')), published: z.boolean() }).strict().superRefine((p, ctx) => { if (p.published) for (const field of ['title', 'excerpt', 'body'] as const) completeTranslations(p[field], [field], ctx); });
export const orderSchema = z.object({ id: z.number().int().positive(), status: z.enum(['NEW', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED']), notes: z.string().max(10000), updatedAt: z.string().datetime() }).strict();
export const statusLabels = { NEW: 'ახალი', PROCESSING: 'დამუშავებაში', SHIPPED: 'გაგზავნილი', COMPLETED: 'დასრულებული', CANCELLED: 'გაუქმებული' } as const;
