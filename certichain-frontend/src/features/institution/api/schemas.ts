import { z } from 'zod';
import { NRC_RE, PASSPORT_RE, POSTAL_RE } from '../utils/myanmar';

// +95 numbers must be canonical; other country codes only need to look like E.164.
const phoneField = z.string().trim().refine((v) =>
  v.startsWith('+95') ? /^\+959\d{6,10}$/.test(v) : /^\+?\d{6,20}$/.test(v));

// Request-body contracts for /api/institution/*.
// applyInstitution is multipart/form-data (fields below + document file parts).

export const institutionTypeEnum = z.enum(['public', 'private']);
export const institutionCategoryEnum = z.enum(['university', 'college', 'degreeCollege', 'institute', 'center']);
export const ministryEnum = z.enum([
  'Ministry of Education',
  'Ministry of Science and Technology',
  'Ministry of Health',
  'Ministry of Defence',
  'Ministry of Religious Affairs',
]);
export const establishmentDocTypeEnum = z.enum([
  'establishmentLaw', 'establishmentAct', 'governmentOrder', 'governmentDecree', 'subDecree',
]);

const personSchema = z.object({
  fullName: z.string().trim().min(1),
  fullNameMyanmar: z.string().trim().optional().or(z.literal('')),
  nationality: z.string().trim().optional().or(z.literal('')),
  race: z.string().trim().optional().or(z.literal('')),
  religion: z.string().trim().optional().or(z.literal('')),
  nrcOrPassport: z.string().trim().refine((v) => !v || NRC_RE.test(v) || PASSPORT_RE.test(v)).optional().or(z.literal('')),
  dateOfBirth: z.string().trim().optional().or(z.literal('')),
  educationalQualification: z.string().trim().optional().or(z.literal('')),
  currentAddress: z.string().trim().optional().or(z.literal('')),
  permanentAddress: z.string().trim().optional().or(z.literal('')),
  phone: z.string().trim().optional().or(z.literal('')),
  email: z.string().trim().optional().or(z.literal('')),
});

export const applyInstitutionSchema = z.object({
  name: z.string().trim().min(1),
  institutionNameMm: z.string().trim().optional().or(z.literal('')),
  institutionType: institutionTypeEnum,
  institutionCategory: institutionCategoryEnum.optional().or(z.literal('')),
  email: z.string().trim().email(),
  password: z.string().min(8),
  phone: phoneField,
  website: z.string().trim().optional().or(z.literal('')),
  // address
  stateRegion: z.string().trim().optional().or(z.literal('')),
  district: z.string().trim().optional().or(z.literal('')),
  township: z.string().trim().optional().or(z.literal('')),
  ward: z.string().trim().optional().or(z.literal('')),
  street: z.string().trim().optional().or(z.literal('')),
  postalCode: z.string().trim().regex(POSTAL_RE).optional().or(z.literal('')),
  // public
  governingMinistry: z.string().trim().optional().or(z.literal('')),
  yearEstablished: z.coerce.number().int().min(1800).max(2100).optional(),
  establishmentDocType: z.string().trim().optional().or(z.literal('')),
  establishmentDocTitle: z.string().trim().optional().or(z.literal('')),
  establishmentDocRef: z.string().trim().optional().or(z.literal('')),
  establishmentDocIssueDate: z.string().trim().optional().or(z.literal('')),
  // private business
  companyName: z.string().trim().optional().or(z.literal('')),
  dicaCertificateNumber: z.string().trim().optional().or(z.literal('')),
  mycoRegistrationNumber: z.string().trim().optional().or(z.literal('')),
  tinNumber: z.string().trim().optional().or(z.literal('')),
  incorporationDate: z.string().trim().optional().or(z.literal('')),
  ownershipStructure: z.string().trim().optional().or(z.literal('')),
  investmentAmount: z.coerce.number().optional(),
  foreignInvolvement: z.boolean().optional(),
  micPermitNumber: z.string().trim().optional().or(z.literal('')),
  // JSON strings for variable-shape
  foundersJson: z.string().optional(),
  administratorJson: z.string().optional(),
}).superRefine((v, ctx) => {
  if (v.institutionType === 'public' && !v.governingMinistry) {
    // ponytail: no custom message — raw Zod text would surface in error toasts;
    // the form shows its own translated required-field error instead.
    ctx.addIssue({ code: 'custom', path: ['governingMinistry'] });
  }
});

export type ApplyInstitutionInput = z.infer<typeof applyInstitutionSchema>;

export const credentialFieldInputSchema = z.object({
  name: z.string().trim().min(1),
  value: z.string(),
});

export const issueCertificateSchema = z.object({
  graduate_email: z.string().trim().email(),
  fields: z.array(credentialFieldInputSchema),
  expires_at: z.string().trim().min(1).optional(),
});

export const issueActivityRecordSchema = z.object({
  graduate_email: z.string().trim().email(),
  activity: z.string().trim().min(1),
  date: z.string().trim().min(1),
  fields: z.array(credentialFieldInputSchema).optional(),
  expires_at: z.string().trim().min(1).optional(),
});

export const revokeCredentialSchema = z.object({ reason: z.string().trim().min(1) });
export const editCredentialSchema = z.object({ fields: z.array(credentialFieldInputSchema) });
export const upholdDisputeSchema = z.object({
  resolution_note: z.string().trim().min(1),
  action: z.string().trim().min(1),
  fields: z.array(credentialFieldInputSchema).optional(),
});
export const dismissDisputeSchema = z.object({ resolution_note: z.string().trim().min(1) });
export const updateInstitutionSchema = z.object({
  name: z.string().trim().min(1).optional(),
  phone: z.string().trim().min(6).optional().or(z.literal('')),
  website: z.string().trim().optional().or(z.literal('')),
  profileImageUrl: z.string().trim().optional().or(z.literal('')),
  brandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
  accentPattern: z.enum(['hatch', 'dots', 'grid', 'waves', 'circles', 'none']).optional(),
  secondaryBrandColor: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
  accentColor: z.enum(['light', 'brand', 'gold']).optional(),
  patternScale: z.enum(['sm', 'md', 'lg']).optional(),
  titleFont: z.enum(['heading', 'serif', 'mono']).optional(),
  medalPosition: z.enum(['top-left', 'top-right']).optional(),
  watermarkIcon: z.enum(['workspace_premium', 'verified', 'stars', 'none']).optional(),
});
