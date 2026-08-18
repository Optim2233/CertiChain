'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useMe } from '@/features/auth/hooks/useAuth';
import type { UserRole } from '@/features/auth/types/types';

export function RequireAuth({ children, role }: { children: React.ReactNode; role?: UserRole }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  // Same dev-only bypass as proxy.ts - portal pages must be browsable without
  // a real login while iterating on the UI. Remove both bypasses together
  // before deploying past local dev.
  const devBypass = process.env.NODE_ENV !== 'production';
  const { isError, isSuccess } = useMe();
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

  // devBypass skips the redirect-on-error above, but must still wait for
  // useMe() to populate the store - otherwise children render with user:
  // null on first paint (e.g. Settings pages showing a blank email).
  if (devBypass) {
    return isAuthenticated || isError ? children : null;
  }

  if (isError || (!isAuthenticated && !isSuccess)) {
    return null;
  }

  return children;
}