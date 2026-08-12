import { apiClient } from '@/shared/config/axioconfig';
import type { AuthMessage, LoginInput, SignupInput, UserResponse } from '../types/types';

export const authService = {
  async login(input: LoginInput) {
    return apiClient.post<AuthMessage>('/api/auth/login', input);
  },

  async logout() {
    return apiClient.post<AuthMessage>('/api/auth/logout', {});
  },

  async signup(input: SignupInput) {
    return apiClient.post<AuthMessage>('/api/auth/signup', input);
  },

  async getMe() {
    return apiClient.get<UserResponse>('/api/auth/me');
  },
};
