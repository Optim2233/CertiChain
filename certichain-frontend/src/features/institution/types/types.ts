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

export interface CredentialListItem {
  id: string; type: CredentialType; title: string | null; institutionName: string | null;
  graduateEmail: string; status: CredentialStatus; revokeReason: string | null;
  merkleRoot: string | null; signature: string | null; issuedAt: string; expiresAt: string | null;
  institutionBrandColor: string | null; institutionSecondaryBrandColor: string | null;
  institutionLogoUrl: string | null; institutionAccentPattern: string;
  institutionAccentColor: string | null; institutionWatermarkOpacity: number | null;
  institutionPatternScale: string | null; institutionCardRadius: string | null;
  institutionTitleFont: string | null; institutionLogoShape: string | null;
  institutionMedalStyle: string | null; institutionMedalShape: string | null;
  institutionMedalPosition: string | null; institutionMedalIcon: string | null;
  institutionMedalSize: string | null; institutionWatermarkIcon: string | null;
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

export interface StatusBreakdown { issued: number; revoked: number; pendingClaim: number; expired: number }
export interface TypeBreakdown { certificate: number; activityRecord: number }
export interface DisputeSummary { open: number; upheld: number; dismissed: number; medianResolutionHours: number | null }
export interface Bucket { label: string; count: number }
export interface TopCredential { credentialId: string; title: string; verifications: number }

export interface InstitutionAnalytics {
  totalIssued: number;
  totalVerifications: number;
  totalRevokedVerifications: number;
  expiringSoon: number;
  issuancesByDay: DailyCount[];
  verificationsByDay: DailyCount[];
  revokedVerificationsByDay: DailyCount[];
  revocationsByDay: DailyCount[];
  disputesByDay: DailyCount[];
  status: StatusBreakdown;
  byType: TypeBreakdown;
  disputes: DisputeSummary;
  claimLatency: Bucket[];
  expiryBuckets: Bucket[];
  topVerified: TopCredential[];
  verificationYield: number;
  revokeReasonTop: Record<string, number>;
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
  credentialTitle: string | null;
  credentialType: CredentialType | null;
  graduateEmail: string | null;
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
