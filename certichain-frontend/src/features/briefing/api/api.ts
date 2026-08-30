import { apiClient } from '@/shared/config/axioconfig';
import type { Briefing } from '../types/types';

export const briefingService = {
  async get(headers?: Record<string, string>) {
    return apiClient.get<Briefing>('/api/briefing', headers);
  },

  async ack(headers?: Record<string, string>) {
    return apiClient.post<void>('/api/briefing/ack', undefined, headers);
  },
};
