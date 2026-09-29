'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type FormEventHandler, type ReactNode } from 'react';
import { direction, localeNames } from '@/lib/locales';
import { acceptTranslation, changeSource, targetLocales, translationStatus, type TargetLocale, type TranslationValue } from '@/lib/admin/translation-state';

type Entry = { pending: TargetLocale[]; value: TranslationValue; generate: (targets: TargetLocale[], confirmed?: boolean) => Promise<void> };
const TranslationContext = createContext<{ entries: Map<symbol, () => Entry>; activity: (delta: number) => void } | null>(null);

export function TranslationForm({ children, onSubmit, busy = false }: { children: ReactNode; onSubmit: FormEventHandler<HTMLFormElement>; busy?: boolean }) {
  const [active, setActive] = useState(0);
  const [batch, setBatch] = useState(false);
  const [message, setMessage] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const context = useMemo(() => ({ entries: new Map<symbol, () => Entry>(), activity: (delta: number) => setActive(n => n + delta) }), []);
  async function generateAll() {
    const entries = [...context.entries.values()].map(get => get()).filter(entry => entry.pending.length && entry.value.ka.trim());
    if (!entries.length) { setMessage('ჯერ შეავსეთ ქართული ველები, ან გახსენით უკვე შევსებული თარგმანები გადასახედად.'); return; }
    if (entries.some(entry => entry.pending.some(locale => entry.value[locale]?.trim())) && !window.confirm('განახლებას საჭიროებული თარგმანები შეიცვლება, მათ შორის ხელით ჩასწორებული ტექსტი. გავაგრძელოთ?')) return;
    setMessage(''); setBatch(true);
    try {
      // Small batches keep long forms from flooding the provider with requests.
      for (let i = 0; i < entries.length && mounted.current; i += 3) await Promise.all(entries.slice(i, i + 3).map(entry => entry.generate(entry.pending, true)));
    } finally { setBatch(false); }
  }
  return <TranslationContext.Provider value={context}><form onSubmit={event => { if (active || batch || busy) event.preventDefault(); else onSubmit(event); }}>
    <div className="translation-toolbar"><p>შეავსეთ ქართული ველები. ერთი ღილაკით შეიქმნება ყველა გამოტოვებული ან განახლებას საჭიროებული თარგმანი.</p><button type="button" disabled={!!active || batch || busy} onClick={generateAll}>{active || batch ? 'თარგმანები მზადდება…' : 'ყველა ველის თარგმნა'}</button><p role="status">{active || batch ? 'დაელოდეთ თარგმნის დასრულებას, შემდეგ გადაამოწმეთ შედეგები და შეინახეთ.' : message || 'თარგმანები ფორმის შენახვისას ინახება. უკვე შევსებული ენების ხელახლა თარგმნა შეგიძლიათ გადახედვის სექციიდან.'}</p></div>
    <fieldset className="translation-form-fields" disabled={!!active || batch || busy}>{children}</fieldset>
  </form></TranslationContext.Provider>;
}

export function Translations({ label, value, onChange, multiline = false }: { label: string; value: TranslationValue; onChange: (v: TranslationValue) => void; multiline?: boolean }) {
  const [selected, setSelected] = useState<TargetLocale[]>([...targetLocales]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<TargetLocale, string>>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const context = useContext(TranslationContext);
  const latest = useRef(value); latest.current = value;
  const change = useRef(onChange); change.current = onChange;
  const pending = targetLocales.filter(locale => translationStatus(value, locale) !== 'ready');
  const entry = useRef<Entry>({ pending, value, generate });
  entry.current = { pending, value, generate };
  useEffect(() => { const key = Symbol(); context?.entries.set(key, () => entry.current); return () => { context?.entries.delete(key); }; }, [context]);
  async function generate(targets: TargetLocale[], confirmed = false) {
    if (!value.ka.trim() || !targets.length || busy) return;
    if (!confirmed && targets.some(locale => value[locale]?.trim()) && !window.confirm('არჩეულ ენებში არსებული ტექსტი, მათ შორის ხელით ჩასწორებული თარგმანი, შეიცვლება. გავაგრძელოთ?')) return;
    const snapshot = value; setBusy(true); setError(''); setNotice(''); setOpen(true); context?.activity(1);
    try {
      const response = await fetch('/api/admin/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: snapshot.ka, targets }), signal: AbortSignal.timeout(30000) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'თარგმნა ვერ შესრულდა.');
      let next = latest.current;
      const failures = { ...errors };
      let applied = 0;
      for (const result of data.results as { locale: TargetLocale; text?: string; error?: string }[]) {
        delete failures[result.locale];
        if (result.error) failures[result.locale] = result.error;
        else if (result.text && next.ka === snapshot.ka && next[result.locale] === snapshot[result.locale]) {
          next = acceptTranslation(next, result.locale, result.text); applied++;
        } else failures[result.locale] = 'ტექსტი შეიცვალა თარგმნის დროს. შედეგი არ ჩაიწერა; სცადეთ ხელახლა.';
      }
      change.current(next); setErrors(failures);
      if (applied) setNotice(`${applied} ენის თარგმანი მზადაა. გადაამოწმეთ და შეინახეთ ფორმა.`);
    } catch (e) { setError(e instanceof Error ? e.message : 'თარგმნა ვერ შესრულდა.'); }
    finally { setBusy(false); context?.activity(-1); }
  }
  return <fieldset className="translation-editor"><legend>{label}</legend>
    <label>ქართული{multiline ? <textarea required rows={4} maxLength={20000} lang="ka" value={value.ka ?? ''} onChange={e => onChange(changeSource(value, e.target.value))}/> : <input required maxLength={250} lang="ka" value={value.ka ?? ''} onChange={e => onChange(changeSource(value, e.target.value))}/>}</label>
    <div className="admin-inline translation-actions"><button type="button" disabled={busy || !value.ka.trim() || !pending.length} onClick={() => generate(pending)}>{busy ? 'ითარგმნება…' : 'თარგმანების გენერირება'}</button><button className="admin-secondary" type="button" aria-expanded={open} onClick={() => setOpen(!open)}>თარგმანების გადახედვა ({5 - pending.length}/5)</button></div>
    {pending.some(locale => translationStatus(value, locale) === 'stale') && <p className="translation-warning">ქართული ტექსტი შეიცვალა — მონიშნული თარგმანები განახლებას საჭიროებს.</p>}
    {error && <p className="admin-error" role="alert">{error}</p>}{notice && <p role="status">{notice}</p>}
    {open && <div className="translation-review"><p>აირჩიეთ ენები ხელახლა სათარგმნად. არსებული ტექსტის შენარჩუნებისთვის შეგიძლიათ მონიშნოთ „გადამოწმებულია“.</p>
      <div className="admin-inline">{targetLocales.map(locale => <label className="admin-check" key={locale}><input type="checkbox" checked={selected.includes(locale)} onChange={e => setSelected(e.target.checked ? [...selected, locale] : selected.filter(l => l !== locale))}/>{localeNames[locale]}</label>)}</div>
      <button className="admin-secondary" type="button" disabled={busy || !value.ka.trim() || !selected.length} onClick={() => generate(selected)}>არჩეული ენების ხელახლა თარგმნა</button>
      <div className="translation-languages">{targetLocales.map(locale => <section key={locale}><label>{localeNames[locale]} · {{ missing: 'შესავსებია', stale: 'განახლებას საჭიროებს', ready: 'შევსებულია' }[translationStatus(value, locale)]}<textarea rows={multiline ? 5 : 2} maxLength={20000} lang={locale} dir={direction(locale)} value={value[locale] ?? ''} onChange={e => onChange({ ...value, [locale]: e.target.value })}/></label>
        {errors[locale] && <p className="admin-error" role="alert">{errors[locale]}</p>}
        <div className="admin-inline"><button type="button" className="admin-secondary" disabled={busy || !value.ka.trim()} onClick={() => generate([locale])}>თარგმნა</button>{translationStatus(value, locale) === 'stale' && <button type="button" className="admin-secondary" disabled={!value[locale]?.trim()} onClick={() => onChange(acceptTranslation(value, locale, value[locale]))}>გადამოწმებულია — შენარჩუნება</button>}</div>
      </section>)}</div>
    </div>}
  </fieldset>;
}
