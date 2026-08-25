'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useMe } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/features/auth/types/types';

export function RequireAuth({ children, role }: { children: React.ReactNode; role?: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  // Same dev-only bypass as proxy.ts - portal pages must be browsable without
  // a real login while iterating on the UI. Remove both bypasses together
  // before deploying past local dev.
  const devBypass = process.env.NODE_ENV !== 'production';
  const { isError } = useMe();
  const wrongRole = !!role && !!user && user.role !== role;

  useEffect(() => {
    if (isError && !devBypass) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isError, devBypass, pathname, router]);

  if (wrongRole) {
    return (
      <main className="flex min-h-screen items-center justify-center p-10 text-center">
        <p className="text-sm text-[#75777f]">
          You&apos;re signed in with an account that doesn&apos;t have access to this portal.
        </p>
      </main>
    );
  }

  // Children render immediately rather than waiting on useMe(). Blocking here
  // cost every portal page a serial round-trip: children are what call
  // useTimeline()/useCredentials()/etc, so no page data could even start
  // loading until /me came back, and the user stared at a blank content area
  // for that whole hop. Rendering straight through lets /me and the page
  // queries fly in parallel.
  //
  // This is safe because RequireAuth was never the access control: the jwt
  // cookie is httpOnly, the backend authorizes every request independently,
  // and proxy.ts already redirects cookie-less users at the edge in
  // production. This is a UX redirect for the expired/revoked-session case.
  //
  // The tradeoff: pages now mount for one paint with user === null, so
  // anything reading off the auth store must render a skeleton rather than
  // blank text while it fills in (this is why Settings pages skeleton their
  // email field).
  return children;
}
