'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { authService } from '../api/api';
import { useAuthStore } from '../store/authStore';
import type { LoginInput, SignupInput } from '../types/types';

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
  });
}

export function useLogin() {
  const setSession = useAuthStore((state) => state.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: LoginInput) => authService.login(input),
    onSuccess: async () => {
      const { data: user } = await authService.getMe();
      setSession(user);
      router.push('/dashboard');
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

export function useSignup() {
  const setSession = useAuthStore((state) => state.setSession);
  const router = useRouter();

  return useMutation({
    mutationFn: (input: SignupInput) => authService.signup(input),
    onSuccess: async () => {
      const { data: user } = await authService.getMe();
      setSession(user);
      router.push('/dashboard');
    },
  });
}