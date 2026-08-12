'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accreditationService } from '../api/api';
import type { InstitutionStatusFilter } from '../types/types';

export function useInstitutions(status: InstitutionStatusFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: ['institutions', status, page, size],
    queryFn: () => accreditationService.listInstitutions(status, page, size),
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institution', id],
    queryFn: () => accreditationService.getInstitution(id),
    enabled: !!id,
  });
}

export function useAuditLog(institutionId: string | null, page = 0, size = 20) {
  return useQuery({
    queryKey: ['audit-log', institutionId, page, size],
    queryFn: () => accreditationService.getAuditLog(institutionId, page, size),
  });
}

export function useApproveInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accreditationService.approveInstitution(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export function useRequestInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      accreditationService.requestInfo(id, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export function useRejectInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accreditationService.rejectInstitution(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export function useSuspendInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accreditationService.suspendInstitution(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export function useReinstateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accreditationService.reinstateInstitution(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}

export function useRevokeInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accreditationService.revokeInstitution(id, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['institutions'] }),
  });
}