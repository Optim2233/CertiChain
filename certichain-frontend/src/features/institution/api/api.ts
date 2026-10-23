import type { Page } from '@/shared/types/types';
import type { Institution } from '@/features/accreditation';
import type { Credential, DisputeFlag } from '@/features/institution';
import { apiClient } from '@/shared/config/axioconfig';
import type { BatchIssueResult, BatchRevokeResult, BatchSummary, BatchUnrevokeResult, CredentialField, CredentialFieldInput, CredentialSummary, InstitutionAnalytics } from '../types/types';
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
  async applyInstitution(input: {
    fields: Record<string, unknown>;
    files: { establishmentDocFile?: File | null; dicaCertificate?: File | null; taxClearance?: File | null; micPermit?: File | null; documents?: File[] };
  }) {
    const parsed = applyInstitutionSchema.parse(input.fields);
    const formData = new FormData();
    Object.entries(parsed).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') formData.append(k, String(v));
      else if (k === 'foreignInvolvement' && typeof v === 'boolean') formData.append(k, String(v));
    });
    // also send ministry alias for backward compat when public
    if (parsed.governingMinistry) formData.append('ministry', parsed.governingMinistry as string);
    if (input.files.establishmentDocFile) formData.append('establishmentDocFile', input.files.establishmentDocFile);
    if (input.files.dicaCertificate) formData.append('dicaCertificate', input.files.dicaCertificate);
    if (input.files.taxClearance) formData.append('taxClearance', input.files.taxClearance);
    if (input.files.micPermit) formData.append('micPermit', input.files.micPermit);
    input.files.documents?.forEach((d) => formData.append('documents', d));
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

  async getAnalytics(days = 30, headers?: Record<string, string>) {
    return apiClient.get<InstitutionAnalytics>(`/api/institution/analytics?days=${days}`, headers);
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

  async issueBatch(spreadsheet: File, batchName?: string, headers?: Record<string, string>) {
    const formData = new FormData();
    formData.append('file', spreadsheet);
    if (batchName?.trim()) formData.append('batchName', batchName.trim());
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
    fields?: CredentialFieldInput[],
    expiresAt?: string,
    headers?: Record<string, string>
  ) {
    return apiClient.post<Credential>(
      '/api/institution/activity-records',
      issueActivityRecordSchema.parse({
        graduate_email: graduateEmail,
        activity,
        date,
        fields,
        expires_at: expiresAt || undefined,
      }),
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

  async unrevokeCredential(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/institution/credentials/${id}/unrevoke`, undefined, headers);
  },

  async listBatches(headers?: Record<string, string>) {
    return apiClient.get<BatchSummary[]>('/api/institution/credentials/batches', headers);
  },

  async listBatchMembers(batchId: string, headers?: Record<string, string>) {
    return apiClient.get<Credential[]>(`/api/institution/credentials/batches/${batchId}`, headers);
  },

  async revokeBatch(batchId: string, reason: string, credentialIds?: string[], headers?: Record<string, string>) {
    return apiClient.post<BatchRevokeResult>(
      `/api/institution/credentials/batches/${batchId}/revoke`,
      { ...revokeCredentialSchema.parse({ reason }), credentialIds: credentialIds?.length ? credentialIds : undefined },
      headers
    );
  },

  async unrevokeBatch(batchId: string, credentialIds?: string[], headers?: Record<string, string>) {
    return apiClient.post<BatchUnrevokeResult>(
      `/api/institution/credentials/batches/${batchId}/unrevoke`,
      { credentialIds: credentialIds?.length ? credentialIds : undefined },
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
    name?: string; phone?: string; website?: string;
    profileImageUrl?: string; profileImage?: File | null;
    brandColor?: string; accentPattern?: string;
    secondaryBrandColor?: string; accentColor?: string; patternScale?: string;
    titleFont?: string;
    medalPosition?: string;
    watermarkIcon?: string;
  }, headers?: Record<string, string>) {
    const parsed = updateInstitutionSchema.parse({
      name: data.name?.trim() || undefined,
      phone: data.phone ?? "",
      website: data.website ?? "",
      profileImageUrl: data.profileImageUrl === undefined ? undefined : data.profileImageUrl.trim(),
      brandColor: data.brandColor === undefined ? undefined : data.brandColor.trim(),
      accentPattern: data.accentPattern as any,
      secondaryBrandColor: (data.secondaryBrandColor as any) === undefined ? undefined : String(data.secondaryBrandColor).trim(),
      accentColor: data.accentColor as any,
      patternScale: data.patternScale as any,
      titleFont: data.titleFont as any,
      medalPosition: data.medalPosition as any,
      watermarkIcon: data.watermarkIcon as any,
    });
    const extraKeys = ["secondaryBrandColor","accentColor","patternScale","titleFont","medalPosition","watermarkIcon"] as const;
    const appendExtras = (fd: FormData) => { for (const k of extraKeys) { const v = (parsed as any)[k]; if (v !== undefined) fd.append(k, String(v)); } };
    if (data.profileImage) {
      const formData = new FormData();
      if (parsed.name) formData.append("name", parsed.name);
      if (parsed.phone) formData.append("phone", parsed.phone);
      if (parsed.website) formData.append("website", parsed.website);
      if (parsed.profileImageUrl !== undefined) formData.append("profileImageUrl", parsed.profileImageUrl);
      if (parsed.brandColor !== undefined) formData.append("brandColor", parsed.brandColor);
      if (parsed.accentPattern) formData.append("accentPattern", parsed.accentPattern);
      appendExtras(formData);
      formData.append("profileImage", data.profileImage);
      return apiClient.putMultipart<Institution>("/api/institution/me", formData, headers);
    }
    return apiClient.put<Institution>("/api/institution/me", {
      name: parsed.name, phone: parsed.phone || undefined, website: parsed.website || undefined,
      profileImageUrl: parsed.profileImageUrl, brandColor: parsed.brandColor, accentPattern: parsed.accentPattern,
      secondaryBrandColor: (parsed as any).secondaryBrandColor, accentColor: (parsed as any).accentColor, patternScale: (parsed as any).patternScale,
      titleFont: (parsed as any).titleFont,
      medalPosition: (parsed as any).medalPosition, watermarkIcon: (parsed as any).watermarkIcon,
    }, headers);
  },

  async resubmitInstitution(input: {
    fields: Record<string, unknown>;
    files: { establishmentDocFile?: File | null; dicaCertificate?: File | null; taxClearance?: File | null; micPermit?: File | null };
  }) {
    const formData = new FormData();
    Object.entries(input.fields).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') formData.append(k, String(v));
      else if (k === 'foreignInvolvement' && typeof v === 'boolean') formData.append(k, String(v));
    });
    if (input.files.establishmentDocFile) formData.append('establishmentDocFile', input.files.establishmentDocFile);
    if (input.files.dicaCertificate) formData.append('dicaCertificate', input.files.dicaCertificate);
    if (input.files.taxClearance) formData.append('taxClearance', input.files.taxClearance);
    if (input.files.micPermit) formData.append('micPermit', input.files.micPermit);
    return apiClient.postMultipart<Institution>('/api/institution/me/resubmit', formData);
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
