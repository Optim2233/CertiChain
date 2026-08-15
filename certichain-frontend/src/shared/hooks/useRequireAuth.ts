'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useMe } from '@/features/auth/hooks/useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  // Same dev-only bypass as proxy.ts - portal pages must be browsable without
  // a real login while iterating on the UI. Remove both bypasses together
  // before deploying past local dev.
  const devBypass = process.env.NODE_ENV !== 'production';
  const { isError, isSuccess } = useMe();

  useEffect(() => {
    if (isError && !devBypass) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isError, devBypass, pathname, router]);

  if (devBypass) {
    return children;
  }

  if (isError || (!isAuthenticated && !isSuccess)) {
    return null;
  }

  return children;
}