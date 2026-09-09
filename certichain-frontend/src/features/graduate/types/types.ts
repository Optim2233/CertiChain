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
  viewCount: number;
}

// Backend returns a bare array of ISO timestamps (List<Instant>), not objects.
export type ShareActivityEntry = string;

// Same bare-timestamp shape as ShareActivityEntry - timestamps only, no verifier identity.
export type VerificationTimestamp = string;

export interface BatchShareRevokeResult {
  revoked: number;
  alreadyRevoked: number;
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

export interface GraduateProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  profileImageUrl: string | null;
}

export interface GraduateProfileInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** "" clears an existing photo; undefined leaves it unchanged. */
  profileImageUrl?: string;
  profileImage?: File | null;
}

export interface GraduateState {
  pendingCredentialCount: number | null;
  setPendingCredentialCount: (count: number) => void;
  clearPendingCredentialCount: () => void;
}