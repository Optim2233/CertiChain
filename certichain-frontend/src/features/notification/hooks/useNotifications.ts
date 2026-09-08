'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../api/api';

export function useNotifications(page = 0, size = 20) {
  return useQuery({
    queryKey: ['notifications', page, size],
    queryFn: () => notificationService.list(page, size),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationService.unreadCount(),
    // Short poll so the bell badge updates without a full page reload -
    // notifications come from other users' actions, not this tab's own mutations.
    refetchInterval: 30 * 1000,
    staleTime: 15 * 1000,
    retry: false,
  });
}

export function useMarkRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}

export function useMarkAllRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });
}
