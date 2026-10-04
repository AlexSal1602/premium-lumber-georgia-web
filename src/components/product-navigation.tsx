'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Locale } from '@/lib/site';
import { speciesLabels } from '@/lib/catalog/i18n';
import { catalogHref, catalogNavigationText } from '@/lib/catalog/navigation';
import { useCart } from './catalog/cart-provider';

export function ProductNavigation({ locale, label, mobile = false, onNavigate }: { locale: Locale; label: string; mobile?: boolean; onNavigate: () => void }) {
  const { categories } = useCart();
  const t = catalogNavigationText[locale];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); onNavigate(); };
  const groups = [
    { title: t.materials, links: Object.entries(speciesLabels).map(([value, names]) => ({ value, label: names[locale], href: catalogHref(locale, 'species', value) })) },
    { title: t.categories, links: categories.map(category => ({ value: category.id, label: category.name[locale], href: catalogHref(locale, 'category', category.id) })) },
  ];
  return <div ref={root} className={`product-navigation ${mobile ? 'is-mobile' : ''}`} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <button ref={trigger} className="product-nav-trigger" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); requestAnimationFrame(() => root.current?.querySelector<HTMLAnchorElement>('.product-nav-panel a')?.focus()); }
    }}>{label}<ChevronDown size={14} aria-hidden="true"/></button>
    <div id={id} className="product-nav-panel" hidden={!open}>
      <Link className="all-products-link" href={catalogHref(locale)} onClick={close}>{t.all}</Link>
      <div className="product-nav-groups">{groups.map(group => mobile ? <details key={group.title}>
        <summary>{group.title}</summary><ul>{group.links.map(link => <li key={link.value}><Link href={link.href} onClick={close}>{link.label}</Link></li>)}</ul>
      </details> : <section key={group.title}><h2>{group.title}</h2><ul>{group.links.map(link => <li key={link.value}><Link href={link.href} onClick={close}>{link.label}</Link></li>)}</ul></section>)}</div>
    </div>
  </div>;
}
