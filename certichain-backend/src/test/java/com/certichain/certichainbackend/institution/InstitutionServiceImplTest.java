package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.SignedCredential;
import com.certichain.certichainbackend.common.service.SigningService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Institution service rules not covered by BatchCsvParseTest / RevokeBatchTest. */
class InstitutionServiceImplTest {

    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final InstitutionDocumentRepository institutionDocumentRepository = mock(InstitutionDocumentRepository.class);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final DisputeFlagRepository disputeFlagRepository = mock(DisputeFlagRepository.class);
    private final AuditLogEntryRepository auditLogEntryRepository = mock(AuditLogEntryRepository.class);
    private final SigningService signingService = mock(SigningService.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final NotificationService notificationService = mock(NotificationService.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);

    private static final byte[] RAW_DEK = "B".repeat(32).getBytes(StandardCharsets.UTF_8);
    private final EnvelopeEncryptionService envelopeEncryptionService =
            new EnvelopeEncryptionServiceImpl("A".repeat(32));
    private final CredentialFieldCryptoService credentialFieldCryptoService =
            new CredentialFieldCryptoService(envelopeEncryptionService, institutionRepository);

    private final UUID institutionId = UUID.randomUUID();
    private final UUID actorId = UUID.randomUUID();

    private final InstitutionServiceImpl service = new InstitutionServiceImpl(
            institutionRepository, institutionDocumentRepository, userRepository, credentialRepository,
            credentialFieldRepository, disputeFlagRepository, auditLogEntryRepository,
            signingService, auditLogService,
            notificationService, null, passwordEncoder, currentUser, credentialFieldCryptoService);

    /** Wraps a fresh DEK with the app-wide KEK and stamps it on the institution. */
    private Institution minted(Institution institution) {
        EncryptedPayload wrapped = envelopeEncryptionService.encrypt(RAW_DEK, envelopeEncryptionService.kek());
        institution.setDekWrapped(wrapped.ciphertext());
        institution.setDekIv(wrapped.iv());
        return institution;
    }

    /** Builds a "title" row the way the DB stores it - Base64 ciphertext + IV - for a
     *  real-crypto round trip through {@code decryptedTitlesByCredential}. */
    private CredentialField encryptedTitle(Credential c, String plaintext) {
        EncryptedPayload payload = envelopeEncryptionService.encrypt(
                plaintext.getBytes(StandardCharsets.UTF_8),
                new javax.crypto.spec.SecretKeySpec(RAW_DEK, "AES"));
        return CredentialField.builder()
                .credentialId(c.getId()).fieldName("title")
                .fieldValue(java.util.Base64.getEncoder().encodeToString(payload.ciphertext()))
                .fieldValueIv(payload.iv())
                .build();
    }

    private void callerIsApprovedInstitution() {
        when(currentUser.institutionId()).thenReturn(institutionId);
        when(currentUser.id()).thenReturn(actorId);
        when(institutionRepository.findById(institutionId)).thenReturn(Optional.of(minted(Institution.builder()
                .id(institutionId).name("UIT").ministry("MoST")
                .status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build())));
    }

    private Credential ownedCredential(CredentialStatus status) {
        UUID id = UUID.randomUUID();
        Credential c = Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(institutionId)
                .graduateUserId(UUID.randomUUID()).graduateEmail("g@x.com")
                .status(status).issuedAt(Instant.now()).build();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(c));
        return c;
    }

    private void stubSigning() {
        when(signingService.signCredential(any(), any())).thenAnswer(inv -> {
            List<Field> fields = inv.getArgument(0);
            List<SignedCredential.FieldWithIndex> indexed = new java.util.ArrayList<>();
            for (int i = 0; i < fields.size(); i++) {
                indexed.add(new SignedCredential.FieldWithIndex(
                        fields.get(i).name(), fields.get(i).value(), i));
            }
            return new SignedCredential("root", "sig", indexed);
        });
        when(credentialRepository.save(any(Credential.class))).thenAnswer(i -> {
            Credential c = i.getArgument(0);
            if (c.getId() == null) c.setId(UUID.randomUUID());
            return c;
        });
    }

    // ponytail: helper to build ApplyInstitutionRequest for legacy 7-arg test calls
    private ApplyInstitutionRequest req(String name, String ministry, String email, String password, String phone, String website, List<org.springframework.web.multipart.MultipartFile> docs) {
        return ApplyInstitutionRequest.builder()
                .name(name).governingMinistry(ministry).email(email).password(password)
                .phone(phone).website(website).documents(docs).build();
    }

    // --- apply (self-registration) ---

    @Test
    void applyRejectsBlankRequiredFields() {
        assertThrows(ValidationException.class,
                () -> service.apply(req("", "MoST", "e@x.com", "pw", null, null, null)));
        assertThrows(ValidationException.class,
                () -> service.apply(req("UIT", "MoST", "e@x.com", "  ", null, null, null)));
    }

    @Test
    void applyRejectsDuplicateEmail() {
        when(userRepository.existsByEmail("e@x.com")).thenReturn(true);
        assertThrows(ValidationException.class,
                () -> service.apply(req("UIT", "MoST", "e@x.com", "pw", null, null, null)));
        verify(institutionRepository, never()).save(any());
    }

    @Test
    void applyRejectsOverlongPhoneAndWebsite() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        assertThrows(ValidationException.class,
                () -> service.apply(req("UIT", "MoST", "e@x.com", "pw", "1".repeat(51), null, null)));
        assertThrows(ValidationException.class,
                () -> service.apply(req("UIT", "MoST", "e@x.com", "pw", null, "w".repeat(256), null)));
    }

    @Test
    void applyCreatesPendingInstitutionThenUser() {
        when(userRepository.existsByEmail("e@x.com")).thenReturn(false);
        when(passwordEncoder.encode("pw")).thenReturn("hash");
        when(institutionRepository.save(any(Institution.class))).thenAnswer(i -> {
            Institution inst = i.getArgument(0);
            inst.setId(UUID.randomUUID());
            return inst;
        });

        Institution result = service.apply(req("UIT", "MoST", "e@x.com", "pw", " +855 1 ", " https://uit.edu ", null));

        assertEquals(InstitutionStatus.PENDING, result.getStatus());
        assertEquals("+855 1", result.getPhone());
        assertEquals("https://uit.edu", result.getWebsite());
        verify(userRepository).save(any(User.class));
        verify(auditLogService).log(eq("Institution application submitted"), any(), any(), any());
    }

    // --- updateOwnInstitution validation ---

    @Test
    void updateRejectsBadBrandColor() {
        callerIsApprovedInstitution();
        assertThrows(ValidationException.class, () -> service.updateOwnInstitution(
                null, null, null, null, null, "not-a-hex", null, null, null, null, null, null, null));
    }

    @Test
    void updateRejectsTooLightBrandColor() {
        callerIsApprovedInstitution();
        // #ffffff on white fails the 4.5 contrast rule
        assertThrows(ValidationException.class, () -> service.updateOwnInstitution(
                null, null, null, null, null, "#ffffff", null, null, null, null, null, null, null));
    }

    @Test
    void updateRejectsBadAccentPattern() {
        callerIsApprovedInstitution();
        assertThrows(ValidationException.class, () -> service.updateOwnInstitution(
                null, null, null, null, null, null, "sparkles", null, null, null, null, null, null));
    }

    @Test
    void updateRejectsNonHttpLogoUrl() {
        callerIsApprovedInstitution();
        assertThrows(ValidationException.class, () -> service.updateOwnInstitution(
                null, null, null, "ftp://x/y.png", null, null, null, null, null, null, null, null, null));
    }

    @Test
    void updateAcceptsValidDeepColorAndPersists() {
        callerIsApprovedInstitution();
        when(institutionRepository.save(any(Institution.class))).thenAnswer(i -> i.getArgument(0));

        Institution result = service.updateOwnInstitution(
                "UIT Renamed", null, null, null, null, "#1a1a2e", "dots", null, null, null, null, null, null);

        assertEquals("UIT Renamed", result.getName());
        assertEquals("#1a1a2e", result.getBrandColor());
        assertEquals("dots", result.getAccentPattern());
    }

    // --- issueCertificate gate ---

    @Test
    void issueRejectedWhenInstitutionNotApproved() {
        when(currentUser.institutionId()).thenReturn(institutionId);
        when(currentUser.id()).thenReturn(actorId);
        when(institutionRepository.findById(institutionId)).thenReturn(Optional.of(Institution.builder()
                .id(institutionId).name("UIT").ministry("MoST")
                .status(InstitutionStatus.SUSPENDED).appliedAt(Instant.now()).build()));

        assertThrows(ForbiddenActionException.class, () -> service.issueCertificate(
                "g@x.com", List.of(Map.of("name", "degree", "value", "BSc")), null));
    }

    @Test
    void issueCertificateRejectsEmptyFields() {
        assertThrows(ValidationException.class,
                () -> service.issueCertificate("g@x.com", List.of(), null));
    }

    // --- editCredential guards ---

    @Test
    void cannotEditRevokedCredential() {
        callerIsApprovedInstitution();
        Credential revoked = ownedCredential(CredentialStatus.REVOKED);
        assertThrows(ValidationException.class, () -> service.editCredential(
                revoked.getId(), List.of(Map.of("name", "degree", "value", "BSc"))));
    }

    @Test
    void editCredentialRejectsEmptyFields() {
        callerIsApprovedInstitution();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        assertThrows(ValidationException.class, () -> service.editCredential(c.getId(), List.of()));
    }

    @Test
    void cannotTouchAnotherInstitutionsCredential() {
        when(currentUser.institutionId()).thenReturn(institutionId);
        UUID id = UUID.randomUUID();
        when(credentialRepository.findById(id)).thenReturn(Optional.of(Credential.builder()
                .id(id).type(CredentialType.CERTIFICATE).institutionId(UUID.randomUUID())
                .graduateEmail("g@x.com").status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build()));

        assertThrows(ForbiddenActionException.class, () -> service.revokeCredential(id, "reason"));
        assertThrows(ForbiddenActionException.class, () -> service.getCredential(id));
    }

    // --- disputes ---

    private DisputeFlag openDispute(Credential onCredential) {
        UUID id = UUID.randomUUID();
        DisputeFlag d = DisputeFlag.builder()
                .id(id).credentialId(onCredential.getId()).graduateUserId(onCredential.getGraduateUserId())
                .reason("wrong").status(DisputeStatus.OPEN).createdAt(Instant.now()).build();
        when(disputeFlagRepository.findById(id)).thenReturn(Optional.of(d));
        return d;
    }

    @Test
    void listDisputesReturnsEnrichedRowsForAllStatuses() {
        callerIsApprovedInstitution();
        Credential c = Credential.builder()
                .id(UUID.randomUUID()).type(CredentialType.CERTIFICATE).institutionId(institutionId)
                .graduateUserId(UUID.randomUUID()).graduateEmail("grad@uit.edu.mm")
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        when(credentialRepository.findByInstitutionId(institutionId)).thenReturn(List.of(c));

        DisputeFlag open = DisputeFlag.builder().id(UUID.randomUUID()).credentialId(c.getId())
                .reason("wrong").status(DisputeStatus.OPEN).createdAt(Instant.now()).build();
        DisputeFlag dismissed = DisputeFlag.builder().id(UUID.randomUUID()).credentialId(c.getId())
                .reason("also wrong").status(DisputeStatus.DISMISSED).resolutionNote("no")
                .createdAt(Instant.now()).resolvedAt(Instant.now()).build();
        when(disputeFlagRepository.findByCredentialIdInOrderByCreatedAtDesc(List.of(c.getId())))
                .thenReturn(List.of(open, dismissed));
        when(credentialFieldRepository.findByCredentialIdInAndFieldName(any(), eq("title")))
                .thenReturn(List.of(encryptedTitle(c, "BSc CS")));

        List<InstitutionDisputeResponse> rows = service.listDisputes();

        assertEquals(2, rows.size());
        assertEquals("BSc CS", rows.get(0).credentialTitle());
        assertEquals("grad@uit.edu.mm", rows.get(0).graduateEmail());
        assertEquals(CredentialType.CERTIFICATE, rows.get(0).credentialType());
        assertEquals(List.of(DisputeStatus.OPEN, DisputeStatus.DISMISSED),
                rows.stream().map(InstitutionDisputeResponse::status).toList());
    }

    @Test
    void upholdDisputeRequiresResolutionNote() {
        assertThrows(ValidationException.class,
                () -> service.upholdDispute(UUID.randomUUID(), " ", "REVOKE", null));
    }

    @Test
    void upholdDisputeRejectsUnknownAction() {
        callerIsApprovedInstitution();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        DisputeFlag d = openDispute(c);
        assertThrows(ValidationException.class,
                () -> service.upholdDispute(d.getId(), "note", "DELETE", null));
    }

    @Test
    void upholdDisputeWithRevokeMarksCredentialRevokedAndResolvesDispute() {
        callerIsApprovedInstitution();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        DisputeFlag d = openDispute(c);

        service.upholdDispute(d.getId(), "GPA was wrong", "REVOKE", null);

        assertEquals(CredentialStatus.REVOKED, c.getStatus());
        assertEquals(DisputeStatus.UPHELD, d.getStatus());
        assertEquals("GPA was wrong", d.getResolutionNote());
        verify(notificationService).notify(any(), eq("Dispute upheld"), anyString());
    }

    @Test
    void upholdDisputeWithEditResignsWithCorrectedValues() {
        callerIsApprovedInstitution();
        stubSigning();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        DisputeFlag d = openDispute(c);
        CredentialField gpa = CredentialField.builder().id(UUID.randomUUID())
                .credentialId(c.getId()).fieldName("gpa").fieldValue("3.0").merkleIndex(0).build();
        credentialFieldCryptoService.encryptForStorage(gpa, institutionId);
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(c.getId()))
                .thenReturn(List.of(gpa));

        service.upholdDispute(d.getId(), "corrected", "EDIT",
                List.of(Map.of("name", "gpa", "value", "3.9")));

        assertEquals(DisputeStatus.UPHELD, d.getStatus());
        assertEquals(CredentialStatus.ISSUED, c.getStatus()); // edit, not revoke
        verify(signingService).signCredential(any(), any());
    }

    @Test
    void resolvingAnAlreadyResolvedDisputeIsRejected() {
        UUID id = UUID.randomUUID();
        when(disputeFlagRepository.findById(id)).thenReturn(Optional.of(DisputeFlag.builder()
                .id(id).credentialId(UUID.randomUUID()).graduateUserId(UUID.randomUUID())
                .reason("x").status(DisputeStatus.DISMISSED).createdAt(Instant.now()).build()));

        assertThrows(ValidationException.class,
                () -> service.dismissDispute(id, "note"));
    }

    @Test
    void dismissDisputeLeavesCredentialUntouched() {
        callerIsApprovedInstitution();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        DisputeFlag d = openDispute(c);

        service.dismissDispute(d.getId(), "Records are correct");

        assertEquals(CredentialStatus.ISSUED, c.getStatus());
        assertEquals(DisputeStatus.DISMISSED, d.getStatus());
    }

    // --- listCredentials status filter ---

    @Test
    void listCredentialsRejectsUnknownStatus() {
        when(currentUser.institutionId()).thenReturn(institutionId);
        assertThrows(ValidationException.class,
                () -> service.listCredentials("BOGUS", 0, 20));
    }

    // --- duplicate-credential guard ---

    @Test
    void issueRejectsAnIdenticalNonRevokedCredential() {
        callerIsApprovedInstitution();
        stubSigning();
        when(credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, "root", CredentialStatus.REVOKED)).thenReturn(true);

        assertThrows(ValidationException.class, () -> service.issueCertificate(
                "g@x.com", List.of(Map.of("name", "degree", "value", "BSc")), null));
        verify(credentialRepository, never()).save(any(Credential.class));
    }

    @Test
    void issueAllowsReIssueWhenOnlyMatchIsRevoked() {
        callerIsApprovedInstitution();
        stubSigning();
        // statusNot(REVOKED) match is what blocks - a revoked twin returns false here.
        when(credentialRepository.existsByInstitutionIdAndMerkleRootAndStatusNot(
                institutionId, "root", CredentialStatus.REVOKED)).thenReturn(false);
        when(userRepository.findByEmail("g@x.com")).thenReturn(Optional.empty());

        Credential c = service.issueCertificate(
                "g@x.com", List.of(Map.of("name", "degree", "value", "BSc")), null);

        assertEquals(CredentialStatus.PENDING_CLAIM, c.getStatus());
        verify(credentialRepository).save(any(Credential.class));
    }

    // --- analytics decrypts stored (ciphertext) titles ---

    @Test
    void analyticsTopCredentialTitlesAreDecrypted() {
        callerIsApprovedInstitution();
        Credential c = ownedCredential(CredentialStatus.ISSUED);
        when(credentialRepository.findByInstitutionId(institutionId)).thenReturn(List.of(c));
        when(credentialRepository.countByInstitutionIdAndStatusAndExpiresAtBetween(any(), any(), any(), any()))
                .thenReturn(0);
        when(auditLogEntryRepository.countByEventAndCredentialIdIn(any(), any())).thenReturn(0);
        // one clean verification on c -> it surfaces as the top credential
        when(auditLogEntryRepository.findByEventAndCredentialIdInOrderByOccurredAtDesc(
                any(), eq(List.of(c.getId()))))
                .thenReturn(List.of(com.certichain.certichainbackend.common.entity.AuditLogEntry.builder()
                        .id(UUID.randomUUID()).credentialId(c.getId()).build()));
        when(credentialFieldRepository.findByCredentialIdInAndFieldName(any(), eq("title")))
                .thenReturn(List.of(encryptedTitle(c, "BSc Computer Science")));

        InstitutionAnalytics analytics = service.getAnalytics(30);

        assertEquals(1, analytics.topVerified().size());
        assertEquals("BSc Computer Science", analytics.topVerified().get(0).title());
        assertEquals(c.getId().toString(), analytics.topVerified().get(0).credentialId());
    }
}
