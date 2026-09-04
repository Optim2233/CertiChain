import { apiClient } from '@/shared/config/axioconfig';
import type { AuthMessage, LoginInput, SignupInput, UserResponse } from '../types/types';
import { changePasswordSchema, forgotPasswordSchema, loginSchema, resetPasswordSchema, signupSchema } from './schemas';

export const authService = {
  async login(input: LoginInput) {
    return apiClient.post<UserResponse>('/api/auth/login', loginSchema.parse(input));
  },

  async logout() {
    return apiClient.post<AuthMessage>('/api/auth/logout', {});
  },

  async signup(input: SignupInput) {
    return apiClient.post<UserResponse>('/api/auth/signup', signupSchema.parse(input));
  },

  async getMe() {
    return apiClient.get<UserResponse>('/api/auth/me');
  },

  async changePassword(currentPassword: string, newPassword: string) {
    return apiClient.post<{ message: string }>(
      '/api/auth/password',
      changePasswordSchema.parse({ currentPassword, newPassword })
    );
  },

  async forgotPassword(email: string) {
    return apiClient.post<{ message: string }>(
      '/api/auth/forgot-password',
      forgotPasswordSchema.parse({ email })
    );
  },

  async resetPassword(token: string, newPassword: string) {
    return apiClient.post<{ message: string }>(
      '/api/auth/reset-password',
      resetPasswordSchema.parse({ token, newPassword })
    );
  },
};
