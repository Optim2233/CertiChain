import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

const PROTECTED_PATHS = ['/authority', '/institution', '/graduate'];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest) {
  // Locale handling first: rewrites/redirects /my/* and sets NEXT_LOCALE.
  // With localePrefix 'as-needed', default-locale URLs pass through untouched.
  const intlResponse = intlMiddleware(request);

  // If intl issued a redirect/rewrite response (non-default handling),
  // let it through — but still enforce auth on the resolved path below
  // when it is a plain `next()` continuation.
  const { pathname } = request.nextUrl;
  // Strip /en|/my prefix before the auth check so /my/graduate is gated
  // exactly like /graduate.
  const stripped =
    pathname === '/en' || pathname.startsWith('/en/')
      ? pathname.slice(3) || '/'
      : pathname === '/my' || pathname.startsWith('/my/')
        ? pathname.slice(3) || '/'
        : pathname;

  if (process.env.BYPASS_AUTH === '1') {
    return intlResponse;
  }

  // The one check the edge can do correctly: keep cookie-less users out of the
  // portals. We deliberately do NOT bounce authenticated users away from
  // /login - the jwt cookie is httpOnly and opaque here, so a stale/expired
  // cookie is indistinguishable from a live session, and bouncing it would
  // trap the user (can't reach the form to re-auth). The login page itself
  // redirects a genuinely-logged-in user via a real /api/auth/me check.
  if (matches(stripped, PROTECTED_PATHS) && !request.cookies.has('jwt')) {
    // Keep the login URL locale-aware so the user stays in their language.
    const localePrefix =
      pathname === '/my' || pathname.startsWith('/my/') ? '/my' : '';
    const url = new URL(`${localePrefix}/login`, request.url);
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
