import { z } from 'zod';
import { locales, type Locale } from '../locales';
import { checkoutText } from './i18n';
import { validQuantity } from '../catalog/logic';

export function customerSchema(locale: Locale) {
  const e = checkoutText[locale].errors;
  return z.object({
    fullName: z.string().trim().min(2, e.name).max(120, e.name),
    phone: z.string().trim().max(40, e.phone).refine(value => /^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, '').length >= 7 && value.replace(/\D/g, '').length <= 15, e.phone).transform(value => value.replace(/[\s().-]/g, '')),
    email: z.string().trim().max(254, e.email).refine(value => !value || z.string().email().safeParse(value).success, e.email),
    city: z.string().trim().max(100, e.city),
    address: z.string().trim().max(300, e.address),
    deliveryMethod: z.enum(['pickup', 'transport', 'other'], { errorMap: () => ({ message: e.delivery }) }),
    comment: z.string().trim().max(2000, e.comment),
  }).strict().superRefine((value, context) => {
    if (value.deliveryMethod !== 'pickup') {
      if (!value.city) context.addIssue({ code: z.ZodIssueCode.custom, path: ['city'], message: e.city });
      if (!value.address) context.addIssue({ code: z.ZodIssueCode.custom, path: ['address'], message: e.address });
    }
  });
}
export type CustomerInput = z.infer<ReturnType<typeof customerSchema>>;
export const orderLineSchema = z.object({
  productId: z.string().min(1).max(100), variantId: z.string().min(1).max(120),
  unit: z.enum(['m3', 'm2', 'piece', 'lm']), quantity: z.number().finite(),
}).strict().refine(line => validQuantity(line.quantity, line.unit), 'Invalid quantity');
export const orderRequestSchema = z.object({
  locale: z.enum(locales),
  idempotencyKey: z.string().uuid(),
  customer: customerSchema('ka'),
  items: z.array(orderLineSchema).min(1).max(100),
}).strict();
export type OrderRequest = z.infer<typeof orderRequestSchema>;
export const receiptSchema = z.object({ orderNumber: z.string().regex(/^ORD-\d+$/), status: z.literal('NEW'), totalCents: z.number().int().nonnegative(), currency: z.literal('GEL') });
export type OrderReceipt = z.infer<typeof receiptSchema>;
