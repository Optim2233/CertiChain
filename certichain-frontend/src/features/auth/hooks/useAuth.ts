'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '../api/api';
import { useAuthStore } from '../store/authStore';
import type { LoginInput, SignupInput, UserRole } from '../types/types';

const ROLE_HOME: Record<UserRole, string> = {
  ACCREDITATION_AUTHORITY: '/authority',
  INSTITUTION: '/institution',
  GRADUATE: '/graduate',
};

export function useMe() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const setSession = useAuthStore((state) => state.setSession);

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const { data: user } = await authService.getMe();
      setSession(user);
      return user;
    },
    enabled: !isAuthenticated,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: ({ data: user }) => {
      setSession(user);
      router.push(ROLE_HOME[user.role]);
    },
  });
}

export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearSession();
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
  const router = useRouter();

  return useMutation({
    mutationFn: (input: SignupInput) => authService.signup(input),
    onSuccess: ({ data: user }) => {
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