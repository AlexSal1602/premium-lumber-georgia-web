import Link from 'next/link';
import { ContactDetails } from '@/components/contact-details';
import { dictionaries, site, type Locale } from '@/lib/site';
import { catalogText } from '@/lib/catalog/i18n';

export default async function CatalogLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params; const d = dictionaries[locale as Locale];
  if (!d) return children;
  return <>{children}<footer className="catalog-footer"><div className="container"><div className="footer-heading"><div><h2>{d.contact}</h2><p>{d.contactText}</p></div><Link className="contact-button" href={`/${locale}#contacts`}>{d.find}</Link></div><ContactDetails locale={locale as Locale}/><div className="footer-bottom"><span>© {new Date().getFullYear()} {site.name}. {d.rights}</span><Link href={`/${locale}/catalog`}>{catalogText[locale as Locale].catalog}</Link></div></div></footer></>;
}
