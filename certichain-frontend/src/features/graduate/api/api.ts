import type { CredentialField, CredentialListItem, DisputeFlag } from '@/features/institution';
import type { BatchShareRevokeResult, GraduateProfile, GraduateProfileInput, Share, ShareActivityEntry, VerificationTimestamp } from '@/features/graduate';
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

  async getProfile(headers?: Record<string, string>) {
    return apiClient.get<GraduateProfile>('/api/graduate/profile', headers);
  },

  async updateProfile(data: GraduateProfileInput, headers?: Record<string, string>) {
    if (data.profileImage) {
      const formData = new FormData();
      if (data.firstName !== undefined) formData.append('firstName', data.firstName);
      if (data.lastName !== undefined) formData.append('lastName', data.lastName);
      if (data.phone !== undefined) formData.append('phone', data.phone);
      if (data.profileImageUrl !== undefined) formData.append('profileImageUrl', data.profileImageUrl);
      formData.append('profileImage', data.profileImage);
      return apiClient.putMultipart<GraduateProfile>('/api/graduate/profile', formData, headers);
    }
    return apiClient.put<GraduateProfile>('/api/graduate/profile', {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      profileImageUrl: data.profileImageUrl,
    }, headers);
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

  async unrevokeShare(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/graduate/shares/${id}/unrevoke`, {}, headers);
  },

  async revokeShares(shareIds: string[], headers?: Record<string, string>) {
    return apiClient.post<BatchShareRevokeResult>(
      '/api/graduate/shares/revoke-batch',
      { shareIds },
      headers
    );
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

  async withdrawDispute(id: string, headers?: Record<string, string>) {
    return apiClient.post<void>(`/api/graduate/disputes/${id}/withdraw`, {}, headers);
  },

  async getVerificationCount(headers?: Record<string, string>) {
    return apiClient.get<{ totalVerifications: number }>('/api/graduate/verifications/count', headers);
  },

  async getCredentialVerificationHistory(id: string, headers?: Record<string, string>) {
    return apiClient.get<VerificationTimestamp[]>(`/api/graduate/credentials/${id}/verifications`, headers);
  },
};
