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
  // Remodeled registration dossier (V18) — mirrors InstitutionDetailResponse.
  institutionType: string | null;
  institutionNameMm: string | null;
  institutionCategory: string | null;
  stateRegion: string | null;
  district: string | null;
  township: string | null;
  ward: string | null;
  street: string | null;
  postalCode: string | null;
  yearEstablished: number | null;
  establishmentDocType: string | null;
  establishmentDocTitle: string | null;
  establishmentDocRef: string | null;
  establishmentDocIssueDate: string | null;
  establishmentDocUrl: string | null;
  companyName: string | null;
  dicaCertificateNumber: string | null;
  mycoRegistrationNumber: string | null;
  tinNumber: string | null;
  incorporationDate: string | null;
  ownershipStructure: string | null;
  investmentAmount: number | null;
  foreignInvolvement: boolean | null;
  micPermitNumber: string | null;
  dicaCertificateUrl: string | null;
  taxClearanceUrl: string | null;
  micPermitUrl: string | null;
  founders: string | null;
  administrator: string | null;
}

export interface RegistrationPerson {
  fullName?: string;
  fullNameMyanmar?: string;
  nationality?: string;
  nrcOrPassport?: string;
  dateOfBirth?: string;
  educationalQualification?: string;
  currentAddress?: string;
  phone?: string;
  email?: string;
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