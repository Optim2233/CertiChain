export interface CredentialFieldInput {
  name: string;
  value: string;
}

export interface BatchIssueResult {
  row?: number;
  status?: string;
  error?: string;
  credential?: unknown;
}