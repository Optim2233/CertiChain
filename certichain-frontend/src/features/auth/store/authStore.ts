import { create } from 'zustand';
import type { AuthState } from '../types/types';

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setSession: (user) => set({ user, isAuthenticated: true }),
  clearSession: () => set({ user: null, isAuthenticated: false }),
}));
