import type { ShareScope } from '@/shared/types/domain.types';

export interface ShareInput {
  name: string;
  scope: ShareScope;
  credentialId: string | null;
  selectedFieldIds: string[];
}

export interface SignupCheckResult {
  pendingCredentialCount: number;
}
