export { accreditationService } from './api/api';
export {
  useApproveInstitution,
  useAuditLog,
  useDisputedInstitutionIds,
  useInstitution,
  useInstitutionDocuments,
  useInstitutions,
  useReinstateInstitution,
  useRejectInstitution,
  useRequestInfo,
  useRevokeInstitution,
  useSuspendInstitution,
  useVerifyDocument,
} from './hooks/useAccreditation';
export { useAccreditationStore } from './store/accreditationStore';
export type {
  AccreditationState,
  AuditLogEntry,
  Institution,
  InstitutionDocument,
  InstitutionStatus,
  InstitutionStatusFilter,
} from './types/types';