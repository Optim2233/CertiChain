export type UserRole = 'ACCREDITATION_AUTHORITY' | 'INSTITUTION' | 'GRADUATE';

export interface LoginInput {
  email: string;
  password: string;
}

export interface SignupInput {
  email: string;
  password: string;
  role: UserRole;
  institutionId?: string;
}

export interface AuthMessage {
  message: string;
  userId?: string;
}

export interface UserResponse {
  userId: string;
  email: string;
  role: UserRole;
  institutionId: string | null;
}

export interface AuthState {
  user: UserResponse | null;
  isAuthenticated: boolean;
  setSession: (user: UserResponse) => void;
  clearSession: () => void;
}
