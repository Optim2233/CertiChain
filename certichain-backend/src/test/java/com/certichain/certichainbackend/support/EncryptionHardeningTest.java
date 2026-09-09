package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.accreditation.AccreditationServiceImpl;
import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.NotificationService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import com.certichain.certichainbackend.common.service.impl.MerkleServiceImpl;
import com.certichain.certichainbackend.graduate.CredentialListItem;
import com.certichain.certichainbackend.graduate.GraduateServiceImpl;
import com.certichain.certichainbackend.verifier.VerifierServiceImpl;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Hardening regressions for the encryption merge: legacy plaintext must fail
 * closed (never 500), a bad DEK must not poison whole lists, and reinstate
 * must mint a missing DEK.
 */
class EncryptionHardeningTest {

    private static final String KEK = "T".repeat(32);

    private final EnvelopeEncryptionServiceImpl envelope = new EnvelopeEncryptionServiceImpl(KEK);

    private Institution minted(Institution institution) {
        EncryptedPayload wrapped = envelope.encrypt(
                envelope.generateDek().getEncoded(), envelope.kek());
        institution.setDekWrapped(wrapped.ciphertext());
        institution.setDekIv(wrapped.iv());
        return institution;
    }

    @Test
    void legacyPlaintextVerifyFailsClosedAsInvalidNot500() {
        CredentialRepository credentialRepository = mock(CredentialRepository.class);
        CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
        InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
        MerkleServiceImpl merkleService = new MerkleServiceImpl(null);
        CredentialFieldCryptoService crypto =
                new CredentialFieldCryptoService(envelope, institutionRepository);
        VerifierServiceImpl service = new VerifierServiceImpl(
                credentialRepository, credentialFieldRepository, institutionRepository,
                null, null, merkleService, mock(AuditLogService.class), null, crypto,
                TestCrypto.pii());

        UUID credentialId = UUID.randomUUID();
        UUID institutionId = UUID.randomUUID();
        when(institutionRepository.findById(institutionId)).thenReturn(Optional.of(
                minted(Institution.builder().id(institutionId).name("UIT").ministry("MoST")
                        .status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build())));
        // Stored root was computed over the plaintext title back in the pre-encryption era.
        Credential credential = Credential.builder().id(credentialId)
                .type(CredentialType.CERTIFICATE).institutionId(institutionId)
                .graduateEmail("g@x.com").status(CredentialStatus.ISSUED)
                .merkleRoot(merkleService.computeRoot(
                        List.of(new Field("title", "Bachelor of Engineering (legacy)"))))
                .signature("sig").issuedAt(Instant.now()).build();
        when(credentialRepository.findById(credentialId)).thenReturn(Optional.of(credential));
        // Legacy row: plaintext + null IV, so Base64 decode throws IllegalArgumentException.
        when(credentialFieldRepository.findByCredentialIdOrderByMerkleIndex(credentialId))
                .thenReturn(List.of(CredentialField.builder().id(UUID.randomUUID())
                        .credentialId(credentialId).fieldName("title")
                        .fieldValue("Bachelor of Engineering (legacy)").merkleIndex(0).build()));

        // Must not throw: fail closed to unverifiable.
        assertEquals(VerificationResult.INVALID_NOT_FOUND,
                service.verifyById(credentialId).result());
    }

    @Test
    void timelineDecryptFailureBlanksTitleInsteadOfLeakingCiphertextOr500() {
        CredentialRepository credentialRepository = mock(CredentialRepository.class);
        CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
        InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        CredentialFieldCryptoService crypto = mock(CredentialFieldCryptoService.class);
        when(crypto.decryptedTitlesByCredential(any(), anyList()))
                .thenThrow(new IllegalStateException("bad DEK"));
        GraduateServiceImpl service = new GraduateServiceImpl(
                null, credentialRepository, credentialFieldRepository, null, null, null, null, null, null,
                null, null, currentUser, crypto, TestCrypto.pii());

        UUID graduateId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(graduateId);
        String ciphertext = "Y2lwaGVydGV4dC1jb3VsZC1iZS1oZXJl";
        when(credentialRepository.findTimelineByGraduateUserId(graduateId)).thenReturn(List.of(
                new CredentialListItem(credentialId, CredentialType.CERTIFICATE, ciphertext,
                        "UIT", "g@x.com", CredentialStatus.ISSUED, null, "root", "sig",
                        Instant.now(), null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null, null)));

        List<CredentialListItem> timeline = service.getTimeline();

        assertEquals(1, timeline.size());
        assertNull(timeline.get(0).title());
    }

    @Test
    void reinstateMintsMissingDekForPreEncryptionInstitution() {
        InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
        CurrentUser currentUser = mock(CurrentUser.class);
        when(currentUser.id()).thenReturn(UUID.randomUUID());
        AccreditationServiceImpl service = new AccreditationServiceImpl(
                institutionRepository, null, mock(AuditLogService.class),
                mock(NotificationService.class), mock(
                        com.certichain.certichainbackend.common.repository.UserRepository.class),
                null, null, currentUser, envelope, TestCrypto.pii());

        UUID id = UUID.randomUUID();
        Institution institution = Institution.builder().id(id).name("Old Uni")
                .ministry("MoE").status(InstitutionStatus.SUSPENDED)
                .appliedAt(Instant.now()).build();
        when(institutionRepository.findById(id)).thenReturn(Optional.of(institution));

        service.reinstate(id);

        assertEquals(InstitutionStatus.APPROVED, institution.getStatus());
        assertNotNull(institution.getDekWrapped());
        assertNotNull(institution.getDekIv());
    }
}
