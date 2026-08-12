import { create } from 'zustand';
import type { GraduateState } from '../types/types';

export const useGraduateStore = create<GraduateState>((set) => ({
  pendingCredentialCount: null,
  setPendingCredentialCount: (pendingCredentialCount) => set({ pendingCredentialCount }),
  clearPendingCredentialCount: () => set({ pendingCredentialCount: null }),
}));