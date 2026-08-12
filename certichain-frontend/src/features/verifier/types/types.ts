export type VerificationResult = 'VERIFIED' | 'REVOKED' | 'INVALID_NOT_FOUND';

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
  disclosedFields: DisclosedField[];
  signatureDetails: string | null;
}

export type ShareVerificationResponse = VerificationResponse | VerificationResponse[];

export interface VerifierState {
  lastResult: VerificationResponse | null;
  setLastResult: (result: VerificationResponse | null) => void;
  clearLastResult: () => void;
}
