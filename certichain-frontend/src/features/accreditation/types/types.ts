export type InstitutionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'REVOKED';

export interface Institution {
  id: string;
  name: string;
  ministry: string;
  status: InstitutionStatus;
  statusReason: string | null;
  appliedAt: string;
  decidedAt: string | null;
  phone: string | null;
  website: string | null;
  profileImageUrl: string | null;
  brandColor: string | null;
  accentPattern: string;
}

export interface InstitutionDocument {
  id: string;
  fileName: string;
  verified: boolean;
  uploadedAt: string;
}

export interface AuditLogEntry {
  id: string;
  event: string;
  actorEmail: string | null;
  institutionId: string | null;
  credentialId: string | null;
  occurredAt: string;
}

export type InstitutionStatusFilter = InstitutionStatus | null;

export interface AccreditationState {
  statusFilter: InstitutionStatusFilter;
  setStatusFilter: (filter: InstitutionStatusFilter) => void;
}