import { create } from 'zustand';
import type { VerifierState } from '../types/types';

export const useVerifierStore = create<VerifierState>((set) => ({
  lastResult: null,
  setLastResult: (lastResult) => set({ lastResult }),
  clearLastResult: () => set({ lastResult: null }),
}));