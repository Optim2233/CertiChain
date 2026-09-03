import type { Page } from '@/shared/types/types';
import type { AuditLogEntry, Institution, InstitutionDetail, InstitutionDocument } from '@/features/accreditation';
import { apiClient } from '@/shared/config/axioconfig';
import {
  rejectInstitutionSchema,
  requestInfoSchema,
  revokeInstitutionSchema,
  suspendInstitutionSchema,
} from './schemas';

export const accreditationService = {
  async listInstitutions(
    status: string | null = null,
    page = 0,
    size = 20,
    q: string | null = null,
    headers?: Record<string, string>
  ) {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (q && q.trim()) params.set("q", q.trim());
    params.set("page", String(page));
    params.set("size", String(size));
    return apiClient.get<Page<Institution>>(`/api/aa/institutions?${params.toString()}`, headers);
  },

  async getInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.get<InstitutionDetail>(`/api/aa/institutions/${id}`, headers);
  },

  async getDisputedInstitutionIds(headers?: Record<string, string>) {
    return apiClient.get<string[]>('/api/aa/institutions/disputed-ids', headers);
  },

  async approveInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/approve`, {}, headers);
  },

  async requestInfo(id: string, note: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${id}/request-info`,
      requestInfoSchema.parse({ note }),
      headers
    );
  },

  async rejectInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${id}/reject`,
      rejectInstitutionSchema.parse({ reason }),
      headers
    );
  },

  async suspendInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${id}/suspend`,
      suspendInstitutionSchema.parse({ reason }),
      headers
    );
  },

  async reinstateInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/reinstate`, {}, headers);
  },

  async revokeInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${id}/revoke`,
      revokeInstitutionSchema.parse({ reason }),
      headers
    );
  },

  async listDocuments(id: string, headers?: Record<string, string>) {
    return apiClient.get<InstitutionDocument[]>(`/api/aa/institutions/${id}/documents`, headers);
  },

  async verifyDocument(institutionId: string, documentId: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${institutionId}/documents/${documentId}/verify`,
      {},
      headers
    );
  },

  async getAuditLog(
    institutionId: string | null = null,
    page = 0,
    size = 20,
    headers?: Record<string, string>
  ) {
    const params = new URLSearchParams();
    if (institutionId) params.set("institutionId", institutionId);
    params.set("page", String(page));
    params.set("size", String(size));
    return apiClient.get<Page<AuditLogEntry>>(`/api/aa/audit-log?${params.toString()}`, headers);
  },
};
