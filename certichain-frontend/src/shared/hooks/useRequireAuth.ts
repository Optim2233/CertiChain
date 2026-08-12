'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useMe } from '@/features/auth/hooks/useAuth';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const { isError, isSuccess } = useMe();

  useEffect(() => {
    if (isError) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isError, pathname, router]);

  if (isError || (!isAuthenticated && !isSuccess)) {
    return null;
  }

  return children;
}