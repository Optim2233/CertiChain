import type { Credential, CredentialField, DisputeFlag, Share } from '@/shared/types/domain.types';
import { apiClient } from '@/shared/lib/api-client';

export const graduateService = {
  async signupCheck(email: string) {
    return apiClient.post<{ pendingCredentialCount: number }>('/api/graduate/signup/check', {
      email,
    });
  },

  async signup(email: string, password: string) {
    return apiClient.post<void>('/api/graduate/signup', { email, password });
  },

  async getTimeline(headers?: Record<string, string>) {
    return apiClient.get<Credential[]>('/api/graduate/timeline', headers);
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
      { name, scope, credentialId, selectedFieldIds },
      headers
    );
  },

  async listShares(headers?: Record<string, string>) {
    return apiClient.get<Share[]>('/api/graduate/shares', headers);
  },

  async revokeShare(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/graduate/shares/${id}/revoke`, {}, headers);
  },

  async flagCredential(id: string, reason: string, headers?: Record<string, string>) {
    return apiClient.post<DisputeFlag>(
      `/api/graduate/credentials/${id}/flag`,
      { reason },
      headers
    );
  },

  async getCredentialFlags(id: string, headers?: Record<string, string>) {
    return apiClient.get<DisputeFlag[]>(`/api/graduate/credentials/${id}/flags`, headers);
  },
};
