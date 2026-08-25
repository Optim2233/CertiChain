'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { accreditationService } from '../api/api';
import type { InstitutionStatusFilter } from '../types/types';

export function useInstitutions(status: InstitutionStatusFilter, page = 0, size = 20) {
  return useQuery({
    queryKey: ['institutions', status, page, size],
    queryFn: () => accreditationService.listInstitutions(status, page, size),
    // Paging keeps the current rows visible instead of flashing a skeleton.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useDisputedInstitutionIds() {
  return useQuery({
    queryKey: ['institutions-disputed-ids'],
    queryFn: () => accreditationService.getDisputedInstitutionIds(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institution', id],
    queryFn: () => accreditationService.getInstitution(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useInstitutionDocuments(institutionId: string) {
  return useQuery({
    queryKey: ['institution-documents', institutionId],
    queryFn: () => accreditationService.listDocuments(institutionId),
    enabled: !!institutionId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useVerifyDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ institutionId, documentId }: { institutionId: string; documentId: string }) =>
      accreditationService.verifyDocument(institutionId, documentId),
    onSuccess: (_data, { institutionId }) => {
      queryClient.invalidateQueries({ queryKey: ['institution-documents', institutionId] });
    },
  });
}

export function useAuditLog(institutionId: string | null, page = 0, size = 20) {
  return useQuery({
    queryKey: ['audit-log', institutionId, page, size],
    queryFn: () => accreditationService.getAuditLog(institutionId, page, size),
    // Paging keeps the current rows visible instead of flashing a skeleton.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useApproveInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accreditationService.approveInstitution(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
    },
  });
}

export function useRequestInfo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) =>
      accreditationService.requestInfo(id, note),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
    },
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
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
    },
  });
}

export function useReinstateInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => accreditationService.reinstateInstitution(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
    },
  });
}

export function useRevokeInstitution() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      accreditationService.revokeInstitution(id, reason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['institutions'] });
      queryClient.invalidateQueries({ queryKey: ['institution', id] });
    },
  });
}