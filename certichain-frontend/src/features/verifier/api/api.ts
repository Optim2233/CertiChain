import { apiClient } from '@/shared/config/axioconfig';
import type {
  BulkVerifyRow,
  PublicInstitution,
  ShareVerificationResponse,
  TrustStats,
  VerificationResponse,
} from '../types/types';

export const verifierService = {
  async verifyCertificate(id: string) {
    return apiClient.get<VerificationResponse>(`/api/verify/certificate/${id}`);
  },

  async verifyFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postMultipart<VerificationResponse>('/api/verify/file', formData);
  },

  async verifyBulk(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postMultipart<BulkVerifyRow[]>('/api/verify/bulk', formData);
  },

  async verifyShare(token: string) {
    return apiClient.get<ShareVerificationResponse>(`/api/verify/share/${token}`);
  },

  async getPublicInstitutions() {
    return apiClient.get<PublicInstitution[]>('/api/verify/institutions');
  },

  async getTrustStats() {
    return apiClient.get<TrustStats>('/api/verify/stats');
  },
};
