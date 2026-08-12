export type InstitutionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED';

export type CredentialStatus = 'PENDING_CLAIM' | 'ISSUED' | 'REVOKED';

export type CredentialType = 'CERTIFICATE' | 'ACTIVITY_RECORD';

export type DisputeStatus = 'OPEN' | 'UPHELD' | 'DISMISSED';

export type ShareScope = 'SINGLE_CREDENTIAL' | 'FULL_TIMELINE';

export interface Institution {
  id: string;
  name: string;
  ministry: string;
  status: InstitutionStatus;
  statusReason: string | null;
  appliedAt: string;
  decidedAt: string | null;
}

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
}

export interface CredentialField {
  id: string;
  credentialId: string;
  fieldName: string;
  fieldValue: string;
  merkleIndex: number;
}

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

export interface AuditLogEntry {
  id: string;
  event: string;
  actorUserId: string | null;
  institutionId: string | null;
  credentialId: string | null;
  occurredAt: string;
}
