package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Share;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import com.certichain.certichainbackend.common.enums.ShareScope;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.ShareFieldSelectionRepository;
import com.certichain.certichainbackend.common.repository.ShareRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.NotificationService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Graduate ownership guards + selective-disclosure validation. No DB, no HTTP. */
class GraduateSharesAndDisputesTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final ShareRepository shareRepository = mock(ShareRepository.class);
    private final ShareFieldSelectionRepository shareFieldSelectionRepository = mock(ShareFieldSelectionRepository.class);
    private final DisputeFlagRepository disputeFlagRepository = mock(DisputeFlagRepository.class);
    private final AuditLogEntryRepository auditLogEntryRepository = mock(AuditLogEntryRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);

    private final UUID meId = UUID.randomUUID();

    private final GraduateServiceImpl service = new GraduateServiceImpl(
            userRepository, credentialRepository, credentialFieldRepository, shareRepository,
            shareFieldSelectionRepository, disputeFlagRepository, auditLogEntryRepository,
            auditLogService, notificationService, null, null, currentUser, null,
            com.certichain.certichainbackend.support.TestCrypto.pii());

    {
        when(currentUser.id()).thenReturn(meId);
        when(userRepository.findByInstitutionId(any())).thenReturn(List.of());
    }

    private Credential myCredential() {
        UUID id = UUID.randomUUID();
        Credential c = Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(UUID.randomUUID())
                .graduateUserId(meId).graduateEmail("me@x.com")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        return c;
    }

    private Credential someoneElsesCredential() {
        UUID id = UUID.randomUUID();
        Credential c = Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(UUID.randomUUID())
                .graduateUserId(UUID.randomUUID()).graduateEmail("other@x.com")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        return c;
    }

    // --- createShare ---

    @Test
    void createShareRejectsBlankName() {
        assertThrows(ValidationException.class,
                () -> service.createShare("  ", "FULL_TIMELINE", null, null));
    }

    @Test
    void createShareRejectsUnknownScope() {
        assertThrows(ValidationException.class,
                () -> service.createShare("My share", "PARTIAL", null, null));
    }

    @Test
    void singleCredentialShareRequiresCredentialId() {
        assertThrows(ValidationException.class,
                () -> service.createShare("s", "SINGLE_CREDENTIAL", null, null));
    }

    @Test
    void fullTimelineShareRejectsACredentialId() {
        assertThrows(ValidationException.class,
                () -> service.createShare("s", "FULL_TIMELINE", UUID.randomUUID(), null));
    }

    @Test
    void cannotShareAnotherGraduatesCredential() {
        Credential theirs = someoneElsesCredential();
        assertThrows(ForbiddenActionException.class,
                () -> service.createShare("s", "SINGLE_CREDENTIAL", theirs.getId(), null));
        verify(shareRepository, never()).save(any());
    }

    @Test
    void selectedFieldMustBelongToTheCredential() {
        Credential mine = myCredential();
        when(shareRepository.save(any(Share.class))).thenAnswer(i -> {
            Share s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(mine.getId()))
                .thenReturn(List.of(CredentialField.builder().id(UUID.randomUUID())
                        .credentialId(mine.getId()).fieldName("gpa").fieldValue("3.9").merkleIndex(0).build()));

        UUID foreignFieldId = UUID.randomUUID();
        assertThrows(ValidationException.class,
                () -> service.createShare("s", "SINGLE_CREDENTIAL", mine.getId(), List.of(foreignFieldId)));
    }

    @Test
    void singleCredentialShareRejectsEmptyFieldSelection() {
        // A share saved with no selected fields writes no share_field_selection rows, and
        // the verifier reads "no rows" as "disclose nothing" - so the link verified but
        // rendered an empty credential. Refuse it at creation instead.
        Credential mine = myCredential();
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(mine.getId()))
                .thenReturn(List.of(CredentialField.builder().id(UUID.randomUUID())
                        .credentialId(mine.getId()).fieldName("gpa").fieldValue("3.9").merkleIndex(0).build()));

        assertThrows(ValidationException.class,
                () -> service.createShare("s", "SINGLE_CREDENTIAL", mine.getId(), List.of()));
        assertThrows(ValidationException.class,
                () -> service.createShare("s", "SINGLE_CREDENTIAL", mine.getId(), null));

        verify(shareRepository, never()).save(any(Share.class));
    }

    @Test
    void validSingleCredentialShareIsSavedAndAudited() {
        Credential mine = myCredential();
        CredentialField f = CredentialField.builder().id(UUID.randomUUID())
                .credentialId(mine.getId()).fieldName("gpa").fieldValue("3.9").merkleIndex(0).build();
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(mine.getId()))
                .thenReturn(List.of(f));
        when(shareRepository.save(any(Share.class))).thenAnswer(i -> {
            Share s = i.getArgument(0);
            s.setId(UUID.randomUUID());
            return s;
        });

        Share share = service.createShare("Employer", "SINGLE_CREDENTIAL", mine.getId(), List.of(f.getId()));

        assertEquals(ShareScope.SINGLE_CREDENTIAL, share.getScope());
        assertTrue(share.getShareToken() != null && !share.getShareToken().isBlank());
        verify(shareFieldSelectionRepository).save(any());
        verify(auditLogService).log(any(), any(), any(), any(), any());
    }

    // --- ownShare guards ---

    @Test
    void revokeShareRejectsForeignShare() {
        UUID shareId = UUID.randomUUID();
        when(shareRepository.findById(shareId)).thenReturn(Optional.of(Share.builder()
                .id(shareId).graduateUserId(UUID.randomUUID()).name("x")
                .scope(ShareScope.FULL_TIMELINE).shareToken("t").createdAt(Instant.now()).build()));

        assertThrows(ForbiddenActionException.class, () -> service.revokeShare(shareId));
    }

    @Test
    void revokeShareMissingIs404() {
        UUID shareId = UUID.randomUUID();
        when(shareRepository.findById(shareId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.revokeShare(shareId));
    }

    @Test
    void revokeShareFlagsOnlyTheLink() {
        UUID shareId = UUID.randomUUID();
        Share share = Share.builder().id(shareId).graduateUserId(meId).name("x")
                .scope(ShareScope.FULL_TIMELINE).shareToken("t").createdAt(Instant.now()).build();
        when(shareRepository.findById(shareId)).thenReturn(Optional.of(share));

        service.revokeShare(shareId);

        assertTrue(share.isRevoked());
    }

    // --- flagCredential ---

    @Test
    void flagRejectsBlankReason() {
        assertThrows(ValidationException.class,
                () -> service.flagCredential(UUID.randomUUID(), " "));
    }

    @Test
    void cannotFlagAnotherGraduatesCredential() {
        Credential theirs = someoneElsesCredential();
        assertThrows(ForbiddenActionException.class,
                () -> service.flagCredential(theirs.getId(), "Wrong GPA"));
        verify(disputeFlagRepository, never()).save(any());
    }

    @Test
    void flagCreatesAnOpenDispute() {
        Credential mine = myCredential();
        when(disputeFlagRepository.save(any(DisputeFlag.class))).thenAnswer(i -> i.getArgument(0));

        DisputeFlag flag = service.flagCredential(mine.getId(), "Wrong GPA");

        assertEquals(DisputeStatus.OPEN, flag.getStatus());
        assertEquals(meId, flag.getGraduateUserId());
        // caller gets plaintext back...
        assertEquals("Wrong GPA", flag.getReason());
        // ...while the persisted row holds ciphertext
        org.mockito.ArgumentCaptor<DisputeFlag> saved =
                org.mockito.ArgumentCaptor.forClass(DisputeFlag.class);
        verify(disputeFlagRepository).save(saved.capture());
        org.junit.jupiter.api.Assertions.assertNotEquals("Wrong GPA", saved.getValue().getReason());
    }

    // --- empty-collection guards (empty IN () is a SQL error) ---

    @Test
    void countsReturnZeroWhenGraduateHasNoCredentials() {
        when(credentialRepository.findByGraduateUserIdOrderByIssuedAtDesc(meId)).thenReturn(List.of());

        assertEquals(0, service.countOpenDisputes());
        assertEquals(0, service.countVerifications());
        assertTrue(service.listOpenDisputes().isEmpty());
        assertTrue(service.listAllDisputes().isEmpty());
        verify(disputeFlagRepository, never()).countByCredentialIdInAndStatus(any(), any());
    }
}
