package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import org.junit.jupiter.api.Test;

import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Regression for the ciphertext-title leak in getTimeline(): findTimelineByGraduateUserId()
 * returns the "title" field_value straight from the DB (Base64 ciphertext), and the timeline
 * must swap in plaintext titles before serving them to the UI.
 */
class GraduateTimelineDecryptTest {

    private static final byte[] RAW_DEK = "B".repeat(32).getBytes(StandardCharsets.UTF_8);

    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final EnvelopeEncryptionService envelopeEncryptionService =
            new EnvelopeEncryptionServiceImpl("A".repeat(32));
    private final CredentialFieldCryptoService credentialFieldCryptoService =
            new CredentialFieldCryptoService(envelopeEncryptionService, institutionRepository);
    private final CurrentUser currentUser = mock(CurrentUser.class);

    private final GraduateServiceImpl service = new GraduateServiceImpl(
            null, credentialRepository, credentialFieldRepository, null, null, null, null, null, null,
            null, null, currentUser, credentialFieldCryptoService,
            com.certichain.certichainbackend.support.TestCrypto.pii());

    /** Wraps a fresh DEK with the app-wide KEK and stamps it on the institution. */
    private Institution minted(Institution institution) {
        EncryptedPayload wrapped = envelopeEncryptionService.encrypt(RAW_DEK, envelopeEncryptionService.kek());
        institution.setDekWrapped(wrapped.ciphertext());
        institution.setDekIv(wrapped.iv());
        return institution;
    }

    /** Builds a "title" row the way the DB stores it - Base64 ciphertext + IV. */
    private CredentialField encryptedTitle(UUID credentialId, String plaintext) {
        EncryptedPayload payload = envelopeEncryptionService.encrypt(
                plaintext.getBytes(StandardCharsets.UTF_8),
                new SecretKeySpec(RAW_DEK, "AES"));
        return CredentialField.builder()
                .credentialId(credentialId).fieldName("title")
                .fieldValue(Base64.getEncoder().encodeToString(payload.ciphertext()))
                .fieldValueIv(payload.iv())
                .build();
    }

    @Test
    void timelineServesDecryptedTitlesNotCiphertext() {
        UUID graduateId = UUID.randomUUID();
        UUID institutionId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(graduateId);
        when(institutionRepository.findById(institutionId))
                .thenReturn(Optional.of(minted(Institution.builder()
                        .id(institutionId).name("UIT").ministry("MoST")
                        .status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build())));

        // The join query returns the raw DB row: ciphertext in the title slot.
        String rawFromDb = "Y2lwaGVydGV4dC1jb3VsZC1iZS1oZXJl";
        CredentialListItem rawItem = new CredentialListItem(
                credentialId, CredentialType.CERTIFICATE, rawFromDb, "UIT", "g@x.com",
                CredentialStatus.ISSUED, null, "root", "sig", Instant.now(), null,
                null, null, null, null, null, null, null, null, null,
                null, null, null, null, null, null, null);
        when(credentialRepository.findTimelineByGraduateUserId(graduateId)).thenReturn(List.of(rawItem));
        when(credentialRepository.findAllById(List.of(credentialId))).thenReturn(List.of(
                Credential.builder().id(credentialId).institutionId(institutionId).build()));
        when(credentialFieldRepository.findByCredentialIdInAndFieldName(List.of(credentialId), "title"))
                .thenReturn(List.of(encryptedTitle(credentialId, "BSc Computer Science")));

        List<CredentialListItem> timeline = service.getTimeline();

        assertEquals(1, timeline.size());
        assertEquals("BSc Computer Science", timeline.get(0).title());
        assertNotEquals(rawFromDb, timeline.get(0).title());
    }

    @Test
    void timelineWithoutTitleFieldLeavesItemAlone() {
        UUID graduateId = UUID.randomUUID();
        UUID institutionId = UUID.randomUUID();
        UUID credentialId = UUID.randomUUID();
        when(currentUser.id()).thenReturn(graduateId);
        when(credentialRepository.findTimelineByGraduateUserId(graduateId)).thenReturn(List.of(
                new CredentialListItem(
                        credentialId, CredentialType.CERTIFICATE, "Fallback title", "UIT", "g@x.com",
                        CredentialStatus.ISSUED, null, "root", "sig", Instant.now(), null,
                        null, null, null, null, null, null, null, null, null,
                        null, null, null, null, null, null, null)));
        // no credential / no title row at all
        when(credentialRepository.findAllById(any())).thenReturn(List.of(
                Credential.builder().id(credentialId).institutionId(institutionId).build()));
        when(credentialFieldRepository.findByCredentialIdInAndFieldName(eq(List.of(credentialId)), any()))
                .thenReturn(List.of());

        List<CredentialListItem> timeline = service.getTimeline();

        assertEquals(1, timeline.size());
        assertEquals("Fallback title", timeline.get(0).title());
    }
}