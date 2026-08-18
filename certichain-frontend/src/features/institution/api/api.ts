import type { Page } from '@/shared/types/types';
import type { Institution } from '@/features/accreditation';
import type { Credential, DisputeFlag } from '@/features/institution';
import { apiClient } from '@/shared/config/axioconfig';
import type { BatchIssueResult, CredentialField, CredentialFieldInput, CredentialSummary } from '../types/types';
import {
  applyInstitutionSchema,
  dismissDisputeSchema,
  editCredentialSchema,
  issueActivityRecordSchema,
  issueCertificateSchema,
  revokeCredentialSchema,
  upholdDisputeSchema,
} from './schemas';

export const institutionService = {
  async applyInstitution(
    name: string,
    ministry: string,
    email: string,
    password: string,
    phone: string,
    website: string,
    documents: File[]
  ) {
    const fields = applyInstitutionSchema.parse({ name, ministry, email, password, phone, website });
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    documents.forEach((doc) => formData.append('documents', doc));
    return apiClient.postMultipart<Institution>('/api/institution/apply', formData);
  },

  async getMe(headers?: Record<string, string>) {
    return apiClient.get<Institution>('/api/institution/me', headers);
  },

  async listCredentials(status: string | null = null, page = 0, size = 20, headers?: Record<string, string>) {
    const query = status
      ? `?status=${status}&page=${page}&size=${size}`
      : `?page=${page}&size=${size}`;
    return apiClient.get<Page<Credential>>(`/api/institution/credentials${query}`, headers);
  },

  async getCredentialSummary(headers?: Record<string, string>) {
    return apiClient.get<CredentialSummary>('/api/institution/credentials/summary', headers);
  },

  async issueCertificate(
    graduateEmail: string,
    fields: CredentialFieldInput[],
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/credentials',
      issueCertificateSchema.parse({ graduate_email: graduateEmail, fields }),
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
      issueActivityRecordSchema.parse({ graduate_email: graduateEmail, activity, date }),
      headers
    );
  },

  async revokeCredential(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/institution/credentials/${id}/revoke`,
      revokeCredentialSchema.parse({ reason }),
      headers
    );
  },

  async getCredentialFields(id: string, headers?: Record<string, string>) {
    return apiClient.get<CredentialField[]>(`/api/institution/credentials/${id}/fields`, headers);
  },

  async getCredential(id: string, headers?: Record<string, string>) {
    return apiClient.get<Credential>(`/api/institution/credentials/${id}`, headers);
  },

  async editCredential(id: string, fields: CredentialFieldInput[], headers?: Record<string, string>) {
    return apiClient.put<Credential>(
      `/api/institution/credentials/${id}`,
      editCredentialSchema.parse({ fields }),
      headers
    );
  },

  async listDisputes(headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>('/api/institution/disputes', headers);
  },

  async upholdDispute(
    id: string,
    resolutionNote: string,
    action: string,
    fields?: CredentialFieldInput[],
    headers?: Record<string, string>
  ) {
    return apiClient.post<void>(
      `/api/institution/disputes/${id}/uphold`,
      upholdDisputeSchema.parse({ resolution_note: resolutionNote, action, fields }),
      headers
    );
  },

  async dismissDispute(id: string, resolutionNote: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/institution/disputes/${id}/dismiss`,
      dismissDisputeSchema.parse({ resolution_note: resolutionNote }),
      headers
    );
  },
};
