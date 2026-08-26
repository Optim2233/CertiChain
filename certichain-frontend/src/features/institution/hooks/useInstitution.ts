'use client';

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { institutionService } from '../api/api';
import { useInstitutionStore } from '../store/institutionStore';
import type { CredentialFieldInput } from '../types/types';

export function useInstitutionMe() {
  const setMe = useInstitutionStore((state) => state.setMe);

  return useQuery({
    queryKey: ['institution-me'],
    queryFn: async () => {
      const { data } = await institutionService.getMe();
      setMe(data);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

export function useCredentials(status: string | null = null, page = 0, size = 20) {
  return useQuery({
    queryKey: ['institution-credentials', status, page, size],
    queryFn: () => institutionService.listCredentials(status, page, size),
    // Keeps the previous page on screen while the next one loads, so paging
    // doesn't flash the table back to a skeleton on every click.
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCredentialSummary() {
  return useQuery({
    queryKey: ['institution-credential-summary'],
    queryFn: () => institutionService.getCredentialSummary(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useInstitutionAnalytics() {
  return useQuery({
    queryKey: ['institution-analytics'],
    queryFn: () => institutionService.getAnalytics(),
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ['institution-disputes'],
    queryFn: () => institutionService.listDisputes(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useApplyInstitution() {
  return useMutation({
    mutationFn: ({
      name,
      ministry,
      email,
      password,
      phone,
      website,
      documents,
    }: {
      name: string;
      ministry: string;
      email: string;
      password: string;
      phone: string;
      website: string;
      documents: File[];
    }) => institutionService.applyInstitution(name, ministry, email, password, phone, website, documents),
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      graduateEmail,
      fields,
      expiresAt,
    }: {
      graduateEmail: string;
      fields: CredentialFieldInput[];
      expiresAt?: string;
    }) => institutionService.issueCertificate(graduateEmail, fields, expiresAt),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] }),
  });
}

export function useIssueBatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (spreadsheet: File) => institutionService.issueBatch(spreadsheet),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] }),
  });
}

export function useIssueActivityRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      graduateEmail,
      activity,
      date,
      expiresAt,
    }: {
      graduateEmail: string;
      activity: string;
      date: string;
      expiresAt?: string;
    }) => institutionService.issueActivityRecord(graduateEmail, activity, date, expiresAt),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] }),
  });
}

export function useRevokeCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      institutionService.revokeCredential(id, reason),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] });
      queryClient.invalidateQueries({ queryKey: ['institution-credential-summary'] });
      queryClient.invalidateQueries({ queryKey: ['institution-credential', id] });
    },
  });
}

export function useCredentialFields(id: string) {
  return useQuery({
    queryKey: ['institution-credential-fields', id],
    queryFn: () => institutionService.getCredentialFields(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useCredential(id: string) {
  return useQuery({
    queryKey: ['institution-credential', id],
    queryFn: () => institutionService.getCredential(id),
    enabled: !!id,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useEditCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, fields }: { id: string; fields: CredentialFieldInput[] }) =>
      institutionService.editCredential(id, fields),
    onSuccess: (_data, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['institution-credential', id] });
      queryClient.invalidateQueries({ queryKey: ['institution-credential-fields', id] });
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] });
    },
  });
}

export function useUpholdDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolutionNote,
      action,
      fields,
    }: {
      id: string;
      resolutionNote: string;
      action: string;
      fields?: CredentialFieldInput[];
    }) => institutionService.upholdDispute(id, resolutionNote, action, fields),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-disputes'] }),
  });
}

export function useDismissDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }: { id: string; resolutionNote: string }) =>
      institutionService.dismissDispute(id, resolutionNote),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-disputes'] }),
  });
}