import { redirect } from 'next/navigation';
import { AdminError, requireAdmin } from '@/lib/admin/auth';
import { AdminDashboard } from '@/components/admin/dashboard';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  try { const { admin } = await requireAdmin(); return <AdminDashboard email={admin.email}/>; }
  catch (error) {
    if (error instanceof AdminError && (error.status === 401 || error.status === 403)) redirect('/admin/login');
    return <main className="admin-login"><h1>ადმინისტრაცია დროებით მიუწვდომელია</h1><p>შეამოწმეთ მონაცემთა ბაზისა და Supabase Auth-ის კონფიგურაცია.</p><a href="/admin/login">შესვლის გვერდი</a></main>;
  }
}
