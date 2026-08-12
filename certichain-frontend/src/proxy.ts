import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/aa', '/institution', '/graduate'];

const AUTH_PATHS = ['/login', '/signup'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasJwtCookie = request.cookies.has('jwt');

  if (matches(pathname, PROTECTED_PATHS) && !hasJwtCookie) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (matches(pathname, AUTH_PATHS) && hasJwtCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
