'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
  });
}

export function useCredentials(page = 0, size = 20) {
  return useQuery({
    queryKey: ['institution-credentials', page, size],
    queryFn: () => institutionService.listCredentials(page, size),
  });
}

export function useDisputes() {
  return useQuery({
    queryKey: ['institution-disputes'],
    queryFn: () => institutionService.listDisputes(),
  });
}

export function useApplyInstitution() {
  return useMutation({
    mutationFn: ({ name, ministry, documents }: { name: string; ministry: string; documents: File[] }) =>
      institutionService.applyInstitution(name, ministry, documents),
  });
}

export function useIssueCertificate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      graduateEmail,
      fields,
    }: {
      graduateEmail: string;
      fields: CredentialFieldInput[];
    }) => institutionService.issueCertificate(graduateEmail, fields),
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
    }: {
      graduateEmail: string;
      activity: string;
      date: string;
    }) => institutionService.issueActivityRecord(graduateEmail, activity, date),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] }),
  });
}

export function useRevokeCredential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      institutionService.revokeCredential(id, reason),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['institution-credentials'] }),
  });
}

export function useUpholdDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      resolutionNote,
      action,
    }: {
      id: string;
      resolutionNote: string;
      action: string;
    }) => institutionService.upholdDispute(id, resolutionNote, action),
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