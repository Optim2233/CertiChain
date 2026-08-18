import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/authority', '/institution', '/graduate'];

const AUTH_PATHS = ['/login', '/register'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  // ponytail: route gating disabled in dev so portal pages are browsable
  // without a real login while reviewing the UI - remove this bypass before
  // deploying past local dev.
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  const hasJwtCookie = request.cookies.has('jwt');

  if (matches(pathname, PROTECTED_PATHS) && !hasJwtCookie) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  if (matches(pathname, AUTH_PATHS) && hasJwtCookie) {
    // Role-specific home is decided client-side (useMe); '/' is a safe
    // redirect target that doesn't require decoding the httpOnly cookie here.
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
