import { NextResponse, type NextRequest } from 'next/server';
import { locales, type Locale } from '@/lib/site';
export function middleware(request: NextRequest) {
 const locale = request.nextUrl.pathname.split('/')[1];
 const headers = new Headers(request.headers);
 headers.set('x-site-locale', locales.includes(locale as Locale) ? locale : 'ka');
 return NextResponse.next({ request: { headers } });
}
export const config = { matcher: ['/((?!api|_next|favicon.ico).*)'] };
