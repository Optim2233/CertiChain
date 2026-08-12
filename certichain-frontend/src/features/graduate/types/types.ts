export type ShareScope = 'SINGLE_CREDENTIAL' | 'FULL_TIMELINE';

export interface Share {
  id: string;
  graduateUserId: string;
  name: string;
  scope: ShareScope;
  credentialId: string | null;
  shareToken: string;
  revoked: boolean;
  createdAt: string;
}

export interface ShareInput {
  name: string;
  scope: ShareScope;
  credentialId: string | null;
  selectedFieldIds: string[];
}

export interface SignupCheckResult {
  pendingCredentialCount: number;
}

export interface GraduateState {
  pendingCredentialCount: number | null;
  setPendingCredentialCount: (count: number) => void;
  clearPendingCredentialCount: () => void;
}