import type { Institution } from '@/shared/types/domain.types';
import { apiClient } from '@/shared/lib/api-client';
import type {
  ShareVerificationResponse,
  VerificationResponse,
} from '../types/verifier.types';

export const verifierService = {
  async verifyCertificate(id: string) {
    return apiClient.get<VerificationResponse>(`/api/verify/certificate/${id}`);
  },

  async verifyFile(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postMultipart<VerificationResponse>('/api/verify/file', formData);
  },

  async verifyShare(token: string) {
    return apiClient.get<ShareVerificationResponse>(`/api/verify/share/${token}`);
  },

  async getPublicInstitutions() {
    return apiClient.get<Institution[]>('/api/verify/institutions');
  },
};
