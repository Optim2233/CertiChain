import { create } from 'zustand';
import type { AccreditationState } from '../types/types';

export const useAccreditationStore = create<AccreditationState>((set) => ({
  statusFilter: null,
  setStatusFilter: (statusFilter) => set({ statusFilter }),
}));