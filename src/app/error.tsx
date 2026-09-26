'use client';
import { usePathname } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { commonText } from '@/lib/translations/common';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
 const segment = usePathname().split('/')[1]; const t = commonText[isLocale(segment) ? segment : 'ka'];
 return <main id="main" className="container" style={{ paddingBlock: 100 }}><h1>{t.errorTitle}</h1><p>{t.errorBody}</p><button className="primary-button" onClick={reset}>{t.retry}</button></main>;
}
