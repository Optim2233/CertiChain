import type { CredentialField, CredentialListItem, DisputeFlag } from '@/features/institution';
import type { Share, ShareActivityEntry, VerificationTimestamp } from '@/features/graduate';
import { apiClient } from '@/shared/config/axioconfig';
import { createShareSchema, flagCredentialSchema, signupCheckSchema, signupSchema } from './schemas';

export const graduateService = {
  async signupCheck(email: string) {
    return apiClient.post<{ pendingCredentialCount: number }>(
      '/api/graduate/signup/check',
      signupCheckSchema.parse({ email })
    );
  },

  async signup(email: string, password: string, firstName: string, lastName: string, phone: string) {
    return apiClient.post<void>(
      '/api/graduate/signup',
      signupSchema.parse({ email, password, firstName, lastName, phone })
    );
  },

  async getTimeline(headers?: Record<string, string>) {
    return apiClient.get<CredentialListItem[]>('/api/graduate/timeline', headers);
  },

  async getCredentialFields(id: string, headers?: Record<string, string>) {
    return apiClient.get<CredentialField[]>(`/api/graduate/credentials/${id}/fields`, headers);
  },

  async createShare(
    name: string,
    scope: string,
    credentialId: string | null,
    selectedFieldIds: string[],
    headers?: Record<string, string>
  ) {
    return apiClient.post<Share>(
      '/api/graduate/shares',
      createShareSchema.parse({ name, scope, credentialId, selectedFieldIds }),
      headers
    );
  },

  async listShares(headers?: Record<string, string>) {
    return apiClient.get<Share[]>('/api/graduate/shares', headers);
  },

  async revokeShare(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/graduate/shares/${id}/revoke`, {}, headers);
  },

  async getShareActivity(id: string, headers?: Record<string, string>) {
    return apiClient.get<ShareActivityEntry[]>(`/api/graduate/shares/${id}/activity`, headers);
  },

  async flagCredential(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<DisputeFlag>(
      `/api/graduate/credentials/${id}/flag`,
      flagCredentialSchema.parse({ reason }),
      headers
    );
  },

  async getCredentialFlags(id: string, headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>(`/api/graduate/credentials/${id}/flags`, headers);
  },

  async getPendingDisputeCount(headers?: Record<string, string>) {
    return apiClient.get<{ pendingDisputeCount: number }>('/api/graduate/disputes/count', headers);
  },

  async getOpenDisputes(headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>('/api/graduate/disputes', headers);
  },

  async getAllDisputes(headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>('/api/graduate/disputes/all', headers);
  },

  async getVerificationCount(headers?: Record<string, string>) {
    return apiClient.get<{ totalVerifications: number }>('/api/graduate/verifications/count', headers);
  },

  async getCredentialVerificationHistory(id: string, headers?: Record<string, string>) {
    return apiClient.get<VerificationTimestamp[]>(`/api/graduate/credentials/${id}/verifications`, headers);
  },
};
