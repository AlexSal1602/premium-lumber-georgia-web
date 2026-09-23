import './globals.css';
import './catalog.css';
import './checkout.css';
import './font.css';
import { headers } from 'next/headers';
export default async function RootLayout({ children }: { children: React.ReactNode }) {
 const locale = (await headers()).get('x-site-locale') ?? 'ka';
 return (
  <html lang={locale}>
   <head>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
    <link
     href="https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@100..900&display=swap"
     rel="stylesheet"
    />
   </head>
   <body>{children}</body>
  </html>
 );
}
