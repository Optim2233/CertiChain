import { z } from 'zod';

// Request-body contracts for /api/institution/*.
// applyInstitution is multipart/form-data (fields below + documents[] files),
// not JSON — schema still documents/validates the non-file fields.
// NOTE: phone/website are sent by the frontend but InstitutionController
// doesn't accept them yet — see FRONTEND-BACKEND-GAPS.md.

export const applyInstitutionSchema = z.object({
  name: z.string().trim().min(1),
  ministry: z.string().trim().min(1),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phone: z.string().trim().min(6),
  // ponytail: website is optional in the form (no backend field to even send it to -
  // see FRONTEND-BACKEND-GAPS.md) and users type bare domains ("www.institution.edu")
  // with no protocol, so no z.url() and no required min-length.
  website: z.string().trim().optional().or(z.literal("")),
});

export const credentialFieldInputSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string(),
});

export const issueCertificateSchema = z.object({
  graduate_email: z.string().trim().email(),
  fields: z.array(credentialFieldInputSchema),
  // Optional, institution's choice - omitted/blank means the credential never expires.
  expires_at: z.string().trim().min(1).optional(),
});

export const issueActivityRecordSchema = z.object({
  graduate_email: z.string().trim().email(),
  activity: z.string().trim().min(1),
  date: z.string().trim().min(1), // ISO date string
  expires_at: z.string().trim().min(1).optional(),
});

export const revokeCredentialSchema = z.object({
  reason: z.string().trim().min(1),
});

export const editCredentialSchema = z.object({
  fields: z.array(credentialFieldInputSchema),
});

export const upholdDisputeSchema = z.object({
  resolution_note: z.string().trim().min(1),
  action: z.string().trim().min(1),
  fields: z.array(credentialFieldInputSchema).optional(),
});

export const dismissDisputeSchema = z.object({
  resolution_note: z.string().trim().min(1),
});
