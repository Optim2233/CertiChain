import type { Page } from '@/shared/types/api.types';
import type { AuditLogEntry, Institution } from '@/shared/types/domain.types';
import { apiClient } from '@/shared/lib/api-client';

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

  async approveInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/approve`, {}, headers);
  },

  async requestInfo(id: string, note: string, headers?: Record<string, string>) {
    return apiClient.post<void>(
      `/api/aa/institutions/${id}/request-info`,
      { note },
      headers
    );
  },

  async rejectInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/reject`, { reason }, headers);
  },

  async suspendInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/suspend`, { reason }, headers);
  },

  async reinstateInstitution(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/reinstate`, {}, headers);
  },

  async revokeInstitution(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/aa/institutions/${id}/revoke`, { reason }, headers);
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
