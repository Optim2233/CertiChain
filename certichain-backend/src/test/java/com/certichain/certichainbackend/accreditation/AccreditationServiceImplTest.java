package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * The status state machine - pure business rules, no I/O. This is the highest-value test in
 * the backend: the terminal-REVOKED rule and the reason requirements are what keep the trust
 * registry meaningful.
 */
class AccreditationServiceImplTest {

    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);

    private final AccreditationServiceImpl service = new AccreditationServiceImpl(
            institutionRepository, null, auditLogService, currentUser);

    private Institution institutionWith(InstitutionStatus status) {
        Institution institution = Institution.builder()
                .id(UUID.randomUUID())
                .name("UIT")
                .ministry("Ministry of Science and Technology")
                .status(status)
                .appliedAt(Instant.now())
                .build();
        when(institutionRepository.findById(institution.getId())).thenReturn(Optional.of(institution));
        when(currentUser.id()).thenReturn(UUID.randomUUID());
        return institution;
    }

    @Test
    void approveMovesPendingToApproved() {
        Institution institution = institutionWith(InstitutionStatus.PENDING);

        service.approve(institution.getId());

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
        verify(auditLogService).log(eq("Institution approved"), any(), eq(institution.getId()), isNull());
    }

    @Test
    void revokedIsTerminalForEveryTransition() {
        Institution institution = institutionWith(InstitutionStatus.REVOKED);
        UUID id = institution.getId();

        assertThrows(ForbiddenActionException.class, () -> service.approve(id));
        assertThrows(ForbiddenActionException.class, () -> service.reinstate(id));
        assertThrows(ForbiddenActionException.class, () -> service.suspend(id, "reason"));
        assertThrows(ForbiddenActionException.class, () -> service.reject(id, "reason"));
        assertThrows(ForbiddenActionException.class, () -> service.revoke(id, "reason"));

        assertEquals(InstitutionStatus.REVOKED, institution.getStatus());
        verify(auditLogService, never()).log(any(), any(), any(), any());
    }

    @Test
    void suspendIsOnlyValidFromApproved() {
        Institution pending = institutionWith(InstitutionStatus.PENDING);
        assertThrows(ValidationException.class, () -> service.suspend(pending.getId(), "reason"));

        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        service.suspend(approved.getId(), "Under investigation");
        assertEquals(InstitutionStatus.SUSPENDED, approved.getStatus());
        assertEquals("Under investigation", approved.getStatusReason());
    }

    @Test
    void reinstateReturnsSuspendedToApprovedAndClearsReason() {
        Institution institution = institutionWith(InstitutionStatus.SUSPENDED);
        institution.setStatusReason("Under investigation");

        service.reinstate(institution.getId());

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
        assertEquals(null, institution.getStatusReason());
    }

    @Test
    void revokeIsAllowedFromApprovedAndFromSuspended() {
        Institution approved = institutionWith(InstitutionStatus.APPROVED);
        service.revoke(approved.getId(), "Fraud confirmed");
        assertEquals(InstitutionStatus.REVOKED, approved.getStatus());

        Institution suspended = institutionWith(InstitutionStatus.SUSPENDED);
        service.revoke(suspended.getId(), "Fraud confirmed");
        assertEquals(InstitutionStatus.REVOKED, suspended.getStatus());
    }

    @Test
    void blankReasonIsRejectedBeforeAnythingChanges() {
        Institution institution = institutionWith(InstitutionStatus.APPROVED);
        UUID id = institution.getId();

        assertThrows(ValidationException.class, () -> service.suspend(id, "  "));
        assertThrows(ValidationException.class, () -> service.suspend(id, null));
        assertThrows(ValidationException.class, () -> service.revoke(id, ""));
        assertThrows(ValidationException.class, () -> service.reject(id, null));

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
    }

    @Test
    void requestInfoLeavesStatusPendingAndDoesNotDecide() {
        Institution institution = institutionWith(InstitutionStatus.PENDING);

        service.requestInfo(institution.getId(), "Please attach the ministry letter");

        assertEquals(InstitutionStatus.PENDING, institution.getStatus());
        assertEquals("Please attach the ministry letter", institution.getStatusReason());
        assertEquals(null, institution.getDecidedAt());
        verify(auditLogService, times(1))
                .log(eq("Information requested"), any(), eq(institution.getId()), isNull());
    }
}
