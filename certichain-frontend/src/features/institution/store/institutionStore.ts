import { create } from 'zustand';
import type { InstitutionState } from '../types/types';

export const useInstitutionStore = create<InstitutionState>((set) => ({
  me: null,
  setMe: (me) => set({ me }),
}));