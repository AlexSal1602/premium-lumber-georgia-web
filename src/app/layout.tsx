import './globals.css';
import './catalog.css';
import './checkout.css';
import './font.css';
import './locale.css';
import { direction, isLocale } from '@/lib/locales';
import { headers } from 'next/headers';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
 const requested = (await headers()).get('x-site-locale');
 const locale = isLocale(requested) ? requested : 'ka';
 return (
  <html lang={locale} dir={direction(locale)}>
   <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
     href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@100..900&family=Noto+Sans+Arabic:wght@100..900&family=Noto+Sans+Georgian:wght@100..900&family=Noto+Sans+Hebrew:wght@100..900&display=swap"
     rel="stylesheet"
    />
   </head>
   <body>{children}</body>
  </html>
 );
}
