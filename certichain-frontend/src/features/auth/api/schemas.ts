import { z } from 'zod';

// Request-body contracts for /api/auth/*. Backend: fields marked optional
// here are optional on the wire; everything else is required.

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

export const signupSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  role: z.enum(['ACCREDITATION_AUTHORITY', 'INSTITUTION', 'GRADUATE']),
  institutionId: z.string().uuid().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});
