import type { Page } from '@/shared/types/api.types';
import type { Credential, DisputeFlag, Institution } from '@/shared/types/domain.types';
import { apiClient } from '@/shared/lib/api-client';
import type { BatchIssueResult, CredentialFieldInput } from '../types/institution.types';

export const institutionService = {
  async applyInstitution(name: string, ministry: string, documents: File[]) {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('ministry', ministry);
    documents.forEach((doc) => formData.append('documents', doc));
    return apiClient.postMultipart<Institution>('/api/institution/apply', formData);
  },

  async getMe(headers?: Record<string, string>) {
    return apiClient.get<Institution>('/api/institution/me', headers);
  },

  async listCredentials(page = 0, size = 20, headers?: Record<string, string>) {
    return apiClient.get<Page<Credential>>(
      `/api/institution/credentials?page=${page}&size=${size}`,
      headers
    );
  },

  async issueCertificate(
    graduateEmail: string,
    fields: CredentialFieldInput[],
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/credentials',
      { graduate_email: graduateEmail, fields },
      headers
    );
  },

  async issueBatch(spreadsheet: File, headers?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', spreadsheet);
    return apiClient.postMultipart<BatchIssueResult[]>(
      '/api/institution/credentials/batch',
      formData,
      headers
    );
  },

  async issueActivityRecord(
    graduateEmail: string,
    activity: string,
    date: string,
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/activity-records',
      { graduate_email: graduateEmail, activity, date },
      headers
    );
  },

  async revokeCredential(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/institution/credentials/${id}/revoke`, { reason }, headers);
  },

  async listDisputes(headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>('/api/institution/disputes', headers);
  },

  async upholdDispute(
    id: string,
    resolutionNote: string,
    action: string,
    headers?: Record<string, string>
  ) {
    return apiClient.post<void>(
      `/api/institution/disputes/${id}/uphold`,
      { resolution_note: resolutionNote, action },
      headers
    );
  },

  async dismissDispute(id: string, resolutionNote: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/institution/disputes/${id}/dismiss`,
      { resolution_note: resolutionNote },
      headers
    );
  },
};
