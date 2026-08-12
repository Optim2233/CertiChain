'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { graduateService } from '../api/api';
import { useGraduateStore } from '../store/graduateStore';
import type { ShareInput } from '../types/types';

export function useSignupCheck(email: string) {
  const setPendingCredentialCount = useGraduateStore(
    (state) => state.setPendingCredentialCount
  );

  return useMutation({
    mutationFn: () => graduateService.signupCheck(email),
    onSuccess: ({ data }) => setPendingCredentialCount(data.pendingCredentialCount),
  });
}

export function useSignup() {
  const clearPendingCredentialCount = useGraduateStore(
    (state) => state.clearPendingCredentialCount
  );

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      graduateService.signup(email, password),
    onSuccess: () => clearPendingCredentialCount(),
  });
}

export function useTimeline() {
  return useQuery({
    queryKey: ['graduate-timeline'],
    queryFn: () => graduateService.getTimeline(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCredentialFields(id: string) {
  return useQuery({
    queryKey: ['graduate-credential-fields', id],
    queryFn: () => graduateService.getCredentialFields(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useShares() {
  return useQuery({
    queryKey: ['graduate-shares'],
    queryFn: () => graduateService.listShares(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCreateShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ShareInput) =>
      graduateService.createShare(
        input.name,
        input.scope,
        input.credentialId,
        input.selectedFieldIds
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['graduate-shares'] }),
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => graduateService.revokeShare(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['graduate-shares'] }),
  });
}

export function useFlagCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      graduateService.flagCredential(id, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['graduate-credential-flags'] }),
  });
}

export function useCredentialFlags(id: string) {
  return useQuery({
    queryKey: ['graduate-credential-flags', id],
    queryFn: () => graduateService.getCredentialFlags(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}