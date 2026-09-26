'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { direction, languagePath, localeNames, locales, type Locale } from '@/lib/locales';
import { commonText } from '@/lib/translations/common';

export function LanguageDropdown({ locale }: { locale: Locale }) {
 const [open, setOpen] = useState(false);
 const [hash, setHash] = useState('');
 const root = useRef<HTMLDivElement>(null);
 const trigger = useRef<HTMLButtonElement>(null);
 const items = useRef<(HTMLAnchorElement | null)[]>([]);
 const id = useId();
 const pathname = usePathname(); const params = useSearchParams();
 useEffect(() => {
  const sync = () => setHash(window.location.hash);
  sync(); window.addEventListener('hashchange', sync);
  return () => window.removeEventListener('hashchange', sync);
 }, [pathname, params]);
 useEffect(() => {
  if (!open) return;
  const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
  document.addEventListener('pointerdown', outside);
  return () => document.removeEventListener('pointerdown', outside);
 }, [open]);
 function show(index: number) {
  setHash(window.location.hash); setOpen(true);
  requestAnimationFrame(() => items.current[index]?.focus());
 }
 function keys(event: KeyboardEvent) {
  const current = items.current.findIndex(item => item === document.activeElement);
  if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
  else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
   event.preventDefault(); const delta = event.key === 'ArrowDown' ? 1 : -1;
   items.current[(current + delta + locales.length) % locales.length]?.focus();
  } else if (event.key === 'Home' || event.key === 'End') {
   event.preventDefault(); items.current[event.key === 'Home' ? 0 : locales.length - 1]?.focus();
  } else if (event.key === ' ') { event.preventDefault(); items.current[current]?.click(); }
 }
 return <div className="language-dropdown" ref={root} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
  <button ref={trigger} className="language-trigger" aria-label={`${commonText[locale].language}: ${localeNames[locale]}`} aria-expanded={open} aria-haspopup="menu" aria-controls={open ? id : undefined}
   onClick={() => open ? setOpen(false) : show(locales.indexOf(locale))}
   onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(event.key === 'ArrowDown' ? 0 : locales.length - 1); } }}>
   <span dir="ltr">{locale.toUpperCase()}</span><ChevronDown size={13} aria-hidden="true"/>
  </button>
  {open && <ul id={id} className="language-menu" role="menu" aria-label={commonText[locale].language} onKeyDown={keys}>
   {locales.map((language, index) => <li key={language} role="none"><a role="menuitemradio" aria-checked={language === locale} tabIndex={-1}
    ref={node => { items.current[index] = node; }} className={language === locale ? 'active' : ''}
    href={languagePath(`${pathname}${params.size ? '?' + params.toString() : ''}${hash}`, language)} hrefLang={language}
    onClick={event => { event.currentTarget.href = languagePath(window.location.pathname + window.location.search + window.location.hash, language); setOpen(false); trigger.current?.focus(); }}>
    <span lang={language} dir={direction(language)}>{localeNames[language]}</span><span className="language-code" dir="ltr">{language.toUpperCase()}</span>{language === locale && <Check size={13} aria-hidden="true"/>}
   </a></li>)}
  </ul>}
 </div>;
}
