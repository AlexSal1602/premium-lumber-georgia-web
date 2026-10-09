import type { Order, OrderItem } from '@prisma/client';

const units: Record<string, string> = { piece: 'ცალი', m3: 'მ³', m2: 'მ²', lm: 'გრძივი მეტრი' };
const delivery: Record<string, string> = { pickup: 'ადგილზე გატანა', transport: 'ტრანსპორტირება', other: 'სხვა მეთოდი' };
const money = (value: number) => `${value.toLocaleString('ka-GE', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₾`;
export const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export function orderEmail(order: Order & { items: OrderItem[] }, test = false) {
  const number = `ORD-${order.id + 1023}`;
  const subject = `${test ? '[სატესტო — არ დაამუშაოთ] ' : ''}ახალი შეკვეთა ${number} — lumber.ge`;
  const details = [
    ['შეკვეთის ნომერი', number],
    ['თარიღი (თბილისი)', order.createdAt.toLocaleString('ka-GE', { timeZone: 'Asia/Tbilisi' })],
    ['მომხმარებელი', order.fullName], ['ტელეფონი', order.phone], ['ელფოსტა', order.email || '—'],
    ['მიწოდება', delivery[order.deliveryMethod] || order.deliveryMethod],
    ['ქალაქი', order.city || '—'], ['მისამართი', order.address || '—'], ['კომენტარი', order.comment || '—'],
  ];
  const lines = order.items.map(item => [item.nameKa,
    `${item.thickness} × ${item.width} × ${item.length} მმ${item.coverageWidth ? `; სამუშაო სიგანე: ${item.coverageWidth} მმ` : ''}`,
    `${item.quantityMilli / 1000} ${units[item.unit] || item.unit}`,
    `${money(item.unitPrice)} / ${units[item.unit] || item.unit}`,
    `${money(item.basePriceCents / 100)} / ${units[item.basePriceUnit] || item.basePriceUnit}`,
    money(item.totalCents / 100),
  ]);
  const headers = ['პროდუქტი', 'ზომები', 'რაოდენობა', 'ერთეულის ფასი', 'საბაზო ფასი', 'ჯამი'];
  const text = [subject, ...details.map(([k, v]) => `${k}: ${v}`), '',
    ...lines.map(row => row.map((v, i) => `${headers[i]}: ${v}`).join('\n') + '\n'),
    `სულ: ${money(order.totalCents / 100)}`, 'მიწოდების საფასური და პირობები დასაზუსტებელია.',
  ].join('\n');
  const html = `<!doctype html><html lang="ka"><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;color:#163b2b;padding:24px"><h1>${escapeHtml(subject)}</h1>${details.map(([k,v]) => `<p><strong>${k}:</strong> <span style="white-space:pre-wrap">${escapeHtml(v)}</span></p>`).join('')}<table cellpadding="10" cellspacing="0" border="1" style="border-collapse:collapse;border-color:#ddd"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${lines.map(row => `<tr>${row.map(v => `<td>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><h2>სულ: ${money(order.totalCents / 100)}</h2><p>მიწოდების საფასური და პირობები დასაზუსტებელია.</p></body></html>`;
  return { subject, html, text };
}
