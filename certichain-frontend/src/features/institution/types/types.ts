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

/** Timeline row for the graduate's credential cards - Credential plus the joined
 * title and issuer name the cards need to be identifiable. */
export interface CredentialListItem {
  id: string;
  type: CredentialType;
  title: string | null;
  institutionName: string | null;
  graduateEmail: string;
  status: CredentialStatus;
  revokeReason: string | null;
  merkleRoot: string | null;
  signature: string | null;
  issuedAt: string;
  expiresAt: string | null;
  institutionBrandColor: string | null;
  institutionLogoUrl: string | null;
  institutionAccentPattern: string;
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

export interface DailyCount {
  date: string;
  count: number;
}

export interface InstitutionAnalytics {
  totalIssued: number;
  totalVerifications: number;
  expiringSoon: number;
  issuancesByDay: DailyCount[];
  verificationsByDay: DailyCount[];
}

export interface BatchIssueResult {
  row?: number;
  status?: string;
  error?: string;
  credentialId?: string;
  batchId?: string;
  graduate?: string;
  credential?: unknown;
}

export interface BatchSummary {
  batchId: string;
  issuedAt: string;
  total: number;
  revoked: number;
}

export interface BatchRevokeResult {
  revoked: number;
  alreadyRevoked: number;
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