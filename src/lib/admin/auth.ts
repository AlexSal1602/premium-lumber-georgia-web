import { cookies } from 'next/headers';
import { db } from '../db';

export class AdminError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const cookieName = 'gw-admin-access';
export function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new AdminError(503, 'Supabase Auth ჯერ არ არის კონფიგურირებული.');
  return { url, key };
}
export async function verifyAdmin(token: string) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new AdminError(401, 'სესია დასრულდა. შედით ხელახლა.');
  const user = await response.json();
  if (typeof user.id !== 'string') throw new AdminError(401, 'სესია არასწორია.');
  const admin = await db.adminUser.findUnique({ where: { id: user.id } });
  if (!admin?.enabled) throw new AdminError(403, 'ადმინის წვდომა არ გაქვთ.');
  return { admin, token };
}
export async function requireAdmin() {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) throw new AdminError(401, 'გთხოვთ გაიაროთ ავტორიზაცია.');
  return verifyAdmin(token);
}
