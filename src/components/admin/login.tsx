'use client';
import { useState } from 'react';
import { BrandLogo } from '@/components/brand-logo';
export function AdminLogin() {
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  return <main className="admin-login"><BrandLogo href="/ka" className="admin-brand"/><p className="admin-kicker">ადმინისტრაცია</p><h1>კეთილი იყოს თქვენი დაბრუნება</h1><p>შედით თქვენი ადმინისტრატორის ანგარიშით.</p>
    <form onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); const form = new FormData(event.currentTarget); try { const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.get('email'), password: form.get('password') }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error); window.location.assign('/admin'); } catch (e) { setError(e instanceof Error ? e.message : 'კავშირი ვერ დამყარდა.'); } finally { setBusy(false); } }}>
      <label>ელფოსტა<input name="email" type="email" autoComplete="username" required/></label><label>პაროლი<input name="password" type="password" autoComplete="current-password" required maxLength={256}/></label><button disabled={busy}>{busy ? 'მიმდინარეობს შესვლა…' : 'შესვლა'}</button>{error && <p role="alert" className="admin-error">{error}</p>}
    </form><small>ანგარიშს უნდა ჰქონდეს ადმინის მინიჭებული უფლება. სესიის ვადა მაქსიმუმ 1 საათია.</small></main>;
}
