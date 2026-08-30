'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { briefingService } from '../api/api';

export function useBriefing() {
  return useQuery({
    queryKey: ['briefing'],
    queryFn: () => briefingService.get(),
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

export function useAckBriefing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => briefingService.ack(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['briefing'] }),
  });
}
