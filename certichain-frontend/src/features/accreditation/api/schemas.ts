import { z } from 'zod';

// Request-body contracts for /api/aa/*.

export const requestInfoSchema = z.object({
  note: z.string().trim().min(1),
});

export const rejectInstitutionSchema = z.object({
  reason: z.string().trim().min(1),
});

export const suspendInstitutionSchema = z.object({
  reason: z.string().trim().min(1),
});

export const revokeInstitutionSchema = z.object({
  reason: z.string().trim().min(1),
});
