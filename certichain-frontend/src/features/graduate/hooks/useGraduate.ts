'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { graduateService } from '../api/api';
import { useGraduateStore } from '../store/graduateStore';
import type { GraduateProfileInput, Share, ShareInput } from '../types/types';
import type { ApiResponse } from '@/shared/types/types';

export function useGraduateProfile() {
  return useQuery({
    queryKey: ['graduate-profile'],
    queryFn: async () => (await graduateService.getProfile()).data,
  });
}

export function useUpdateGraduateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GraduateProfileInput) => graduateService.updateProfile(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduate-profile'] });
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
  });
}

export function useSignupCheck() {
  const setPendingCredentialCount = useGraduateStore(
    (state) => state.setPendingCredentialCount
  );

  return useMutation({
    mutationFn: (email: string) => graduateService.signupCheck(email),
    onSuccess: ({ data }) => setPendingCredentialCount(data.pendingCredentialCount),
  });
}

export function useSignup() {
  const clearPendingCredentialCount = useGraduateStore(
    (state) => state.clearPendingCredentialCount
  );

  return useMutation({
    mutationFn: ({
      email,
      password,
      firstName,
      lastName,
      phone,
    }: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
    }) => graduateService.signup(email, password, firstName, lastName, phone),
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
    onSuccess: ({ data: created }) => {
      // Write the new row into the list right away so the table updates without
      // waiting on the refetch, then invalidate to reconcile with the server.
      queryClient.setQueryData<ApiResponse<Share[]>>(['graduate-shares'], (prev) =>
        prev ? { ...prev, data: [created, ...prev.data] } : prev
      );
      queryClient.invalidateQueries({ queryKey: ['graduate-shares'] });
    },
  });
}

export function useRevokeShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => graduateService.revokeShare(id),
    onSuccess: (_res, id) => {
      queryClient.setQueryData<ApiResponse<Share[]>>(['graduate-shares'], (prev) =>
        prev
          ? { ...prev, data: prev.data.map((s) => (s.id === id ? { ...s, revoked: true } : s)) }
          : prev
      );
      queryClient.invalidateQueries({ queryKey: ['graduate-shares'] });
    },
  });
}

export function useShareActivity(id: string) {
  return useQuery({
    queryKey: ['graduate-share-activity', id],
    queryFn: () => graduateService.getShareActivity(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCredentialVerificationHistory(id: string) {
  return useQuery({
    queryKey: ['graduate-credential-verification-history', id],
    queryFn: () => graduateService.getCredentialVerificationHistory(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useFlagCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      graduateService.flagCredential(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['graduate-credential-flags'] });
      queryClient.invalidateQueries({ queryKey: ['graduate-open-disputes'] });
      queryClient.invalidateQueries({ queryKey: ['graduate-all-disputes'] });
    },
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

export function usePendingDisputeCount() {
  return useQuery({
    queryKey: ['graduate-pending-dispute-count'],
    queryFn: () => graduateService.getPendingDisputeCount(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useOpenDisputes() {
  return useQuery({
    queryKey: ['graduate-open-disputes'],
    queryFn: () => graduateService.getOpenDisputes(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAllDisputes() {
  return useQuery({
    queryKey: ['graduate-all-disputes'],
    queryFn: () => graduateService.getAllDisputes(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useVerificationCount() {
  return useQuery({
    queryKey: ['graduate-verification-count'],
    queryFn: () => graduateService.getVerificationCount(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}