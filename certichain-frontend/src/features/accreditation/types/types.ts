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
  secondaryBrandColor: string | null;
  accentColor: string | null;
  watermarkOpacity: number | null;
  patternScale: string | null;
  cardRadius: string | null;
  titleFont: string | null;
  logoShape: string | null;
  medalStyle: string | null;
  medalShape: string | null;
  medalPosition: string | null;
  medalIcon: string | null;
  medalSize: string | null;
  watermarkIcon: string | null;
}

/** AA institution-detail endpoint only (`GET /api/aa/institutions/{id}`). The raw
 *  `/api/institution/me` entity used elsewhere does not carry these. */
export interface InstitutionDetail extends Institution {
  publicKey: string | null;
  keyAlgorithm: string | null;
  keyGeneratedAt: string | null;
  updatedAt: string | null;
  version: number;
  contactEmail: string | null;
  contactSince: string | null;
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