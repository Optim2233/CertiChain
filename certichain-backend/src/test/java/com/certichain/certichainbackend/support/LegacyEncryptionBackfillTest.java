package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class LegacyEncryptionBackfillTest {

    private static final String OLD_KEK = "a".repeat(32);
    private static final String NEW_KEK = "b".repeat(32);

    private final EnvelopeEncryptionServiceImpl envelope =
            new EnvelopeEncryptionServiceImpl(NEW_KEK);
    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final CredentialFieldRepository credentialFieldRepository = mock(CredentialFieldRepository.class);
    private final SecretKey dek = new EnvelopeEncryptionServiceImpl(OLD_KEK).generateDek();

    private final LegacyEncryptionBackfill backfill =
            new LegacyEncryptionBackfill(institutionRepository, credentialRepository,
                    credentialFieldRepository,
                    new CredentialFieldCryptoService(envelope, institutionRepository),
                    envelope, OLD_KEK);

    @Test
    void rewrapsExistingDekMintsMissingAndEncryptsLegacyPlaintext() {
        EncryptedPayload oldWrap = wrap(dek, OLD_KEK);
        Institution withDek = Institution.builder()
                .id(UUID.randomUUID()).name("legacy WITH dek").status(InstitutionStatus.APPROVED)
                .dekWrapped(oldWrap.ciphertext()).dekIv(oldWrap.iv())
                .build();

        UUID legacyInstitutionId = UUID.randomUUID();
        Institution withoutDek = Institution.builder()
                .id(legacyInstitutionId).name("legacy WITHOUT dek").status(InstitutionStatus.APPROVED)
                .build();

        UUID credentialId = UUID.randomUUID();
        Credential credential = Credential.builder()
                .id(credentialId).institutionId(legacyInstitutionId).build();
        CredentialField title = CredentialField.builder()
                .id(UUID.randomUUID()).credentialId(credentialId).fieldName("title")
                .fieldValue("Bachelor of Engineering (legacy)").merkleIndex(0).build();

        when(institutionRepository.findByDekWrappedIsNotNull()).thenReturn(List.of(withDek));
        when(institutionRepository.findByStatusAndDekWrappedIsNull(InstitutionStatus.APPROVED))
                .thenReturn(List.of(withoutDek));
        when(institutionRepository.findById(legacyInstitutionId)).thenReturn(Optional.of(withoutDek));
        when(institutionRepository.findById(withDek.getId())).thenReturn(Optional.of(withDek));
        when(credentialRepository.findAllById(any())).thenReturn(List.of(credential));
        when(credentialFieldRepository.findByFieldValueIvIsNull()).thenReturn(List.of(title));

        backfill.run();

        // existing DEK was re-wrapped: the raw DEK is still recoverable under the NEW key
        byte[] unwrapped = new EnvelopeEncryptionServiceImpl(NEW_KEK).decrypt(
                new EncryptedPayload(withDek.getDekWrapped(), withDek.getDekIv()), envelope.kek());
        assertEquals(dek.getEncoded().length, unwrapped.length);

        // missing DEK minted under the new key
        assertNotNull(withoutDek.getDekWrapped());
        assertNotNull(withoutDek.getDekIv());

        // legacy plaintext field now stores base64 ciphertext + IV and decrypts back
        assertNotEquals("Bachelor of Engineering (legacy)", title.getFieldValue());
        assertNotNull(title.getFieldValueIv());
        String roundTrip = new CredentialFieldCryptoService(envelope, institutionRepository)
                .decrypted(title, legacyInstitutionId).getFieldValue();
        assertEquals("Bachelor of Engineering (legacy)", roundTrip);
    }

    private EncryptedPayload wrap(SecretKey key, String kekValue) {
        var svc = new EnvelopeEncryptionServiceImpl(kekValue);
        return svc.encrypt(key.getEncoded(), svc.kek());
    }
}