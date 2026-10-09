'use client';
import { useState } from 'react';

export type NotificationStatus = { status: string; attempts: number; lastError: string | null; providerId: string | null; acceptedAt: string | null };
const labels: Record<string, string> = { PENDING: 'გაგზავნის მოლოდინში', SENDING: 'იგზავნება / შედეგი მოწმდება', FAILED: 'გაგზავნა ვერ დადასტურდა', ACCEPTED: 'Resend-მა მიიღო', REVIEW_REQUIRED: 'საჭიროა Resend-ში გადამოწმება' };
export function OrderEmailStatus({ orderId, initial }: { orderId: number; initial: NotificationStatus | null }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState(initial?.status);
  async function retry() {
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/admin/order-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: orderId }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'გაგზავნა ვერ შესრულდა.');
      setStatus(result.notification?.status);
      setMessage(result.notification?.status === 'ACCEPTED' ? 'Resend-მა მიიღო; მიწოდება მოწმდება Resend-ის პანელში.' : 'შედეგი განახლებულია. საჭიროებისას გადაამოწმეთ Resend-ის პანელი.');
    } catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  }
  return <div><small>ელფოსტა: {status ? labels[status] || status : 'ძველი შეკვეთა — შეტყობინება არ შექმნილა'}</small>
    {status === 'ACCEPTED' && <p><small>მიღება არ ნიშნავს მიწოდებას ან წაკითხვას.</small></p>}
    {status === 'REVIEW_REQUIRED' && <p><small>დუბლირების თავიდან ასაცილებლად განმეორება დაბლოკილია. გადაამოწმეთ წერილი Resend-ში.</small></p>}
    {status && ['PENDING', 'FAILED', 'SENDING'].includes(status) && <button type="button" className="admin-secondary" disabled={busy} onClick={retry}>{busy ? 'მოწმდება…' : 'გაგზავნის ხელახლა ცდა'}</button>}
    {message && <p role="status">{message}</p>}
  </div>;
}
