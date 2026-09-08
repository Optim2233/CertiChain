'use client';

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '../api/api';
import { useAuthStore } from '../store/authStore';
import type { LoginInput, SignupInput, UserRole } from '../types/types';

export const ROLE_HOME: Record<UserRole, string> = {
  ACCREDITATION_AUTHORITY: '/authority',
  INSTITUTION: '/institution',
  GRADUATE: '/graduate',
};

export function useMe() {
  const setSession = useAuthStore((state) => state.setSession);
  const query = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await authService.getMe()).data,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  useEffect(() => {
    if (query.data) setSession(query.data);
  }, [query.data, setSession]);
  return query;
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ data: user }) => {
      // Drop any cache from a previous session (esp. ['me']) before seeding
      // the new one, so a stale ['me'] can't re-hydrate the store to the old
      // user and trip the wrong-role guard.
      queryClient.clear();
      setSession(user);
      router.push(ROLE_HOME[user.role]);
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearSession();
      queryClient.clear();
      router.push('/');
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      authService.changePassword(currentPassword, newPassword),
  });
}

export function useSignup() {
  const setSession = useAuthStore((state) => state.setSession);
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (input: SignupInput) => authService.signup(input),
    onSuccess: ({ data: user }) => {
      queryClient.clear();
      setSession(user);
      router.push(ROLE_HOME[user.role]);
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (email: string) => authService.forgotPassword(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ token, newPassword }: { token: string; newPassword: string }) =>
      authService.resetPassword(token, newPassword),
  });
}