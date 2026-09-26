import { headers } from 'next/headers';
import Link from 'next/link';
import { isLocale } from '@/lib/locales';
import { commonText } from '@/lib/translations/common';
export default async function NotFound() {
 const value = (await headers()).get('x-site-locale'); const locale = isLocale(value) ? value : 'ka'; const t = commonText[locale];
 return <main id="main" className="container" style={{ paddingBlock: 100 }}><h1>{t.notFound}</h1><p>{t.notFoundBody}</p><Link className="primary-button" href={`/${locale}`}>{t.home}</Link></main>;
}
