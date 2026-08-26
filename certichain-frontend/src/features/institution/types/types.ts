import type { Institution } from '@/features/accreditation';

export type CredentialStatus = 'PENDING_CLAIM' | 'ISSUED' | 'REVOKED';

export type CredentialType = 'CERTIFICATE' | 'ACTIVITY_RECORD';

export interface Credential {
  id: string;
  type: CredentialType;
  institutionId: string;
  graduateUserId: string | null;
  graduateEmail: string;
  status: CredentialStatus;
  revokeReason: string | null;
  merkleRoot: string | null;
  signature: string | null;
  issuedAt: string;
  expiresAt: string | null;
}

export interface CredentialField {
  id: string;
  credentialId: string;
  fieldName: string;
  fieldValue: string;
  merkleIndex: number;
}

export interface CredentialFieldInput {
  name: string;
  value: string;
}

export interface CredentialSummary {
  total: number;
  revoked: number;
  unclaimed: number;
}

export interface BatchIssueResult {
  row?: number;
  status?: string;
  error?: string;
  credential?: unknown;
}

export type DisputeStatus = 'OPEN' | 'UPHELD' | 'DISMISSED';

export interface DisputeFlag {
  id: string;
  credentialId: string;
  graduateUserId: string;
  reason: string;
  status: DisputeStatus;
  resolutionNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface InstitutionState {
  me: Institution | null;
  setMe: (me: Institution | null) => void;
}