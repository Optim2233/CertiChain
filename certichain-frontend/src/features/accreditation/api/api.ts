import type { Page } from '@/shared/types/types';
import type { AuditLogEntry, Institution, InstitutionDocument } from '@/features/accreditation';
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
    headers?: Record<string, string>
  ) {
    const query = status
      ? `?status=${status}&page=${page}&size=${size}`
      : `?page=${page}&size=${size}`;
    return apiClient.get<Page<Institution>>(`/api/aa/institutions${query}`, headers);
  },

  async getInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.get<Institution>(`/api/aa/institutions/${id}`, headers);
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
    const query = institutionId
      ? `?institutionId=${institutionId}&page=${page}&size=${size}`
      : `?page=${page}&size=${size}`;
    return apiClient.get<Page<AuditLogEntry>>(`/api/aa/audit-log${query}`, headers);
  },
};
