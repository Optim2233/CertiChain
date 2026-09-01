import type { Page } from '@/shared/types/types';
import type { Institution } from '@/features/accreditation';
import type { Credential, DisputeFlag } from '@/features/institution';
import { apiClient } from '@/shared/config/axioconfig';
import type { BatchIssueResult, BatchRevokeResult, BatchSummary, CredentialField, CredentialFieldInput, CredentialSummary, InstitutionAnalytics } from '../types/types';
import {
  applyInstitutionSchema,
  dismissDisputeSchema,
  editCredentialSchema,
  issueActivityRecordSchema,
  issueCertificateSchema,
  revokeCredentialSchema,
  updateInstitutionSchema,
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
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    params.set("page", String(page));
    params.set("size", String(size));
    return apiClient.get<Page<Credential>>(`/api/institution/credentials?${params.toString()}`, headers);
  },

  async getCredentialSummary(headers?: Record<string, string>) {
    return apiClient.get<CredentialSummary>('/api/institution/credentials/summary', headers);
  },

  async getAnalytics(headers?: Record<string, string>) {
    return apiClient.get<InstitutionAnalytics>('/api/institution/analytics', headers);
  },

  async issueCertificate(
    graduateEmail: string,
    fields: CredentialFieldInput[],
    expiresAt?: string,
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/credentials',
      issueCertificateSchema.parse({ graduate_email: graduateEmail, fields, expires_at: expiresAt || undefined }),
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
    expiresAt?: string,
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/activity-records',
      issueActivityRecordSchema.parse({ graduate_email: graduateEmail, activity, date, expires_at: expiresAt || undefined }),
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

  async listBatches(headers?: Record<string, string>) {
    return apiClient.get<BatchSummary[]>('/api/institution/credentials/batches', headers);
  },

  async revokeBatch(batchId: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<BatchRevokeResult>(
      `/api/institution/credentials/batches/${batchId}/revoke`,
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

  async updateMe(data: {
    name?: string;
    phone?: string;
    website?: string;
    profileImageUrl?: string;
    profileImage?: File | null;
    brandColor?: string;
    accentPattern?: "hatch" | "dots" | "none";
  }, headers?: Record<string, string>) {
    const parsed = updateInstitutionSchema.parse({
      name: data.name?.trim() || undefined,
      phone: data.phone ?? "",
      website: data.website ?? "",
      // "" is a meaningful value for these two (clear the logo / brand colour) -
      // keep it distinct from undefined (leave unchanged).
      profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl.trim(),
      brandColor: data.brandColor === undefined ? undefined : data.brandColor.trim(),
      accentPattern: data.accentPattern,
    });
    if (data.profileImage) {
      const formData = new FormData();
      if (parsed.name) formData.append("name", parsed.name);
      if (parsed.phone) formData.append("phone", parsed.phone);
      if (parsed.website) formData.append("website", parsed.website);
      if (parsed.profileImageUrl !== undefined) formData.append("profileImageUrl", parsed.profileImageUrl);
      if (parsed.brandColor !== undefined) formData.append("brandColor", parsed.brandColor);
      if (parsed.accentPattern) formData.append("accentPattern", parsed.accentPattern);
      formData.append("profileImage", data.profileImage);
      return apiClient.putMultipart<Institution>("/api/institution/me", formData, headers);
    }
    return apiClient.put<Institution>("/api/institution/me", {
      name: parsed.name,
      phone: parsed.phone || undefined,
      website: parsed.website || undefined,
      profileImageUrl: parsed.profileImageUrl,
      brandColor: parsed.brandColor,
      accentPattern: parsed.accentPattern,
    }, headers);
  },

  async updateMeJson(data: {
    name?: string;
    phone?: string;
    website?: string;
    profileImageUrl?: string;
  }, headers?: Record<string, string>) {
    return apiClient.put<Institution>("/api/institution/me", updateInstitutionSchema.parse(data), headers);
  },
};
