'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, ShoppingBag, X } from 'lucide-react';
import { dictionaries, type Locale } from '@/lib/site';
import { catalogText } from '@/lib/catalog/i18n';
import { LanguageDropdown } from './language-dropdown';
import { useCart } from './catalog/cart-provider';
import { ProductNavigation } from './product-navigation';
import { BrandLogo } from './brand-logo';

export function SiteHeader({ locale }: { locale: Locale }) {
  const [menu, setMenu] = useState(false);
  const cart = useCart(); const d = dictionaries[locale]; const t = catalogText[locale];
  const anchors = ['about', 'production', 'partnership', 'manufacturing', 'news', 'contacts'];
  const nav = (mobile = false) => d.nav.map((label, i) => i === 1 ? <ProductNavigation key={label} locale={locale} label={label} mobile={mobile} onNavigate={() => setMenu(false)}/> : <Link key={label} href={i === 4 ? `/${locale}/news` : `/${locale}#${anchors[i]}`} onClick={() => setMenu(false)}>{label}</Link>);
  return <header id="top" className="header"><div className="header-inner">
    <BrandLogo href={`/${locale}`} />
    <nav aria-label={d.menu} className="desktop-nav">{nav()}</nav>
    <div className="header-tools"><LanguageDropdown locale={locale}/>
    <button className="cart-trigger icon-button" aria-label={`${t.cart}: ${cart.lines.length}`} onClick={cart.open}><ShoppingBag size={21}/><span>{cart.lines.length}</span></button>
    <button className="menu-toggle" aria-label={d.menu} aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(!menu)}>{menu ? <X/> : <Menu/>}</button></div>
  </div>{menu && <nav id="mobile-menu" className="mobile-nav" aria-label={d.menu}>{nav(true)}</nav>}</header>;
}
