import { z } from 'zod';

export const localized = z.object({ ka: z.string().trim().min(1).max(20000), en: z.string().trim().min(1).max(20000), ru: z.string().trim().min(1).max(20000) }).strict();
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const imageUrl = z.string().url().max(2048).refine(value => new URL(value).protocol === 'https:', 'ფოტოს მისამართი უნდა იწყებოდეს https://-ით');
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
  species: z.enum(['pine', 'spruce', 'larch']), grade: z.enum(['A', 'B', 'AB', 'Extra']), moisture: z.enum(['green', 'air-dried', 'kiln-dried']),
  units: z.array(units).min(1).max(4).refine(v => new Set(v).size === v.length && v.includes('piece'), 'აუცილებელია ერთეული: ცალი'),
  active: z.boolean(), variants: z.array(variant).min(1).max(50),
}).strict().refine(p => new Set(p.variants.map(v => v.id)).size === p.variants.length, 'ზომების კოდები უნდა იყოს უნიკალური')
  .refine(p => p.variants.every(v => p.units.includes(v.price.unit)), 'ფასის ერთეული უნდა იყოს დაშვებული');
export const categorySchema = z.object({ id: slug, name: localized }).strict();
export const postSchema = z.object({ id: z.string().max(100).optional(), slug, title: localized, excerpt: localized, body: localized, image: imageUrl.or(z.literal('')), published: z.boolean() }).strict();
export const orderSchema = z.object({ id: z.number().int().positive(), status: z.enum(['NEW', 'PROCESSING', 'SHIPPED', 'COMPLETED', 'CANCELLED']), notes: z.string().max(10000), updatedAt: z.string().datetime() }).strict();
export const statusLabels = { NEW: 'ახალი', PROCESSING: 'დამუშავებაში', SHIPPED: 'გაგზავნილი', COMPLETED: 'დასრულებული', CANCELLED: 'გაუქმებული' } as const;
