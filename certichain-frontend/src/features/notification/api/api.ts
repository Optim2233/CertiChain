import type { Page } from '@/shared/types/types';
import { apiClient } from '@/shared/config/axioconfig';
import type { Notification } from '../types/types';

export const notificationService = {
  async list(page = 0, size = 20, headers?: Record<string, string>) {
    return apiClient.get<Page<Notification>>(`/api/notifications?page=${page}&size=${size}`, headers);
  },

  async unreadCount(headers?: Record<string, string>) {
    return apiClient.get<{ unreadCount: number }>('/api/notifications/unread-count', headers);
  },

  async markRead(id: string, headers?: Record<string, string>) {
    return apiClient.patch<void>(`/api/notifications/${id}/read`, undefined, headers);
  },

  async markAllRead(headers?: Record<string, string>) {
    return apiClient.patch<void>('/api/notifications/read-all', undefined, headers);
  },
};
