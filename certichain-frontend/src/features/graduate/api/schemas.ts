import { z } from 'zod';

// Request-body contracts for /api/graduate/*.
// NOTE: signupSchema's firstName/lastName/phone are sent by the frontend but
// GraduateController currently only reads email/password off the request
// map — see FRONTEND-BACKEND-GAPS.md.

export const signupCheckSchema = z.object({
  email: z.string().trim().email(),
});

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  phone: z.string().trim().min(6),
});

export const createShareSchema = z.object({
  name: z.string().trim().min(1),
  scope: z.string().trim().min(1),
  credentialId: z.string().uuid().nullable(),
  selectedFieldIds: z.array(z.string().uuid()),
});

export const flagCredentialSchema = z.object({
  reason: z.string().trim().min(1),
});
