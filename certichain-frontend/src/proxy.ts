import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/authority', '/institution', '/graduate'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  if (process.env.BYPASS_AUTH === '1') {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  // The one check the edge can do correctly: keep cookie-less users out of the
  // portals. We deliberately do NOT bounce authenticated users away from
  // /login - the jwt cookie is httpOnly and opaque here, so a stale/expired
  // cookie is indistinguishable from a live session, and bouncing it would
  // trap the user (can't reach the form to re-auth). The login page itself
  // redirects a genuinely-logged-in user via a real /api/auth/me check.
  if (matches(pathname, PROTECTED_PATHS) && !request.cookies.has('jwt')) {
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
