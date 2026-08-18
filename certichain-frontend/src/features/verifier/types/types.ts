export type VerificationResult = 'VERIFIED' | 'REVOKED' | 'INVALID_NOT_FOUND' | 'SHARE_REVOKED';

export interface DisclosedField {
  name: string;
  value: string;
}

export interface VerificationResponse {
  result: VerificationResult;
  credentialTitle: string | null;
  issuedTo: string | null;
  institutionName: string | null;
  institutionStatus: string | null;
  issuedAt: string | null;
  revokedAt: string | null;
  revokeReason: string | null;
  disclosedFields: DisclosedField[];
  signatureDetails: string | null;
  // Only present on SHARE_REVOKED - the backend returns a distinct
  // {result, message} shape for a revoked share *link* (vs a revoked credential).
  message?: string;
}

export type ShareVerificationResponse = VerificationResponse | VerificationResponse[];

export interface TrustStats {
  institutionCount: number;
  verificationCount: number;
}

export interface BulkVerifyRow {
  input: string;
  result: VerificationResult;
  credentialTitle: string | null;
  issuedTo: string | null;
}

export interface VerifierState {
  lastResult: VerificationResponse | null;
  setLastResult: (result: VerificationResponse | null) => void;
  clearLastResult: () => void;
}
