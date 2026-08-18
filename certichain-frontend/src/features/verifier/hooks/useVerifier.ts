'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { verifierService } from '../api/api';
import { useVerifierStore } from '../store/verifierStore';

export function useVerifyCertificate() {
  const setLastResult = useVerifierStore((state) => state.setLastResult);
  return useMutation({
    mutationFn: (id: string) => verifierService.verifyCertificate(id),
    onSuccess: ({ data }) => setLastResult(data),
  });
}

export function useVerifyFile() {
  const setLastResult = useVerifierStore((state) => state.setLastResult);
  return useMutation({
    mutationFn: (file: File) => verifierService.verifyFile(file),
    onSuccess: ({ data }) => setLastResult(data),
  });
}

export function useVerifyShare() {
  const setLastResult = useVerifierStore((state) => state.setLastResult);
  return useMutation({
    mutationFn: (token: string) => verifierService.verifyShare(token),
    onSuccess: ({ data }) => {
      const result = Array.isArray(data) ? data[0] : data;
      setLastResult(result ?? null);
    },
  });
}

export function useVerifyBulk() {
  return useMutation({
    mutationFn: (file: File) => verifierService.verifyBulk(file),
  });
}

export function usePublicInstitutions() {
  return useQuery({
    queryKey: ['verify-institutions'],
    queryFn: () => verifierService.getPublicInstitutions(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function useTrustStats() {
  return useQuery({
    queryKey: ['verify-trust-stats'],
    queryFn: () => verifierService.getTrustStats(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}