package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * One-time backfill for data that predates field-level encryption. Institutions approved
 * before V21/V22 shipped have no wrapped DEK and their credential_field rows hold plaintext
 * (no field_value_iv); this mints a DEK for each, encrypts those fields, and - when the KEK
 * was rotated - re-wraps existing DEKs under the current key first.
 *
 * <p>Gated off by default; run once per environment with {@code BACKFILL_LEGACY_ENCRYPTION=true}
 * ({@code BACKFILL_PREVIOUS_KEK} = the key existing DEKs were wrapped under, only needed for a
 * rotation), then leave it off. Safe to re-run: every pass skips rows it already finished.
 * Signatures survive the field pass because verification hashes decrypted plaintext.
 */
@Component
@ConditionalOnProperty(name = "app.backfill.legacy-encryption", havingValue = "true")
public class LegacyEncryptionBackfill implements CommandLineRunner {

    private final InstitutionRepository institutionRepository;
    private final CredentialRepository credentialRepository;
    private final CredentialFieldRepository credentialFieldRepository;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final String previousKek;

    public LegacyEncryptionBackfill(InstitutionRepository institutionRepository,
                                    CredentialRepository credentialRepository,
                                    CredentialFieldRepository credentialFieldRepository,
                                    CredentialFieldCryptoService credentialFieldCryptoService,
                                    EnvelopeEncryptionService envelopeEncryptionService,
                                    @Value("${app.backfill.previous-kek:}") String previousKek) {
        this.institutionRepository = institutionRepository;
        this.credentialRepository = credentialRepository;
        this.credentialFieldRepository = credentialFieldRepository;
        this.credentialFieldCryptoService = credentialFieldCryptoService;
        this.envelopeEncryptionService = envelopeEncryptionService;
        this.previousKek = previousKek;
    }

    @Override
    @Transactional
    public void run(String... args) {
        int rewrapped = rewrapExistingDekInstitutions();
        int minted = mintMissingDekInstitutions();
        int encrypted = encryptLegacyPlaintextFields();
        System.out.println("[backfill] done - DEKs re-wrapped: " + rewrapped
                + ", DEKs minted: " + minted + ", plaintext fields encrypted: " + encrypted);
    }

    private int rewrapExistingDekInstitutions() {
        if (previousKek == null || previousKek.isBlank()) {
            return 0;
        }
        byte[] currentKekBytes = envelopeEncryptionService.kek().getEncoded();
        byte[] previousKekBytes = previousKek.getBytes(StandardCharsets.UTF_8);
        if (Arrays.equals(currentKekBytes, previousKekBytes)) {
            return 0;
        }
        SecretKey oldKek = new SecretKeySpec(previousKekBytes, "AES");
        int count = 0;
        for (Institution institution : institutionRepository.findByDekWrappedIsNotNull()) {
            byte[] dek = envelopeEncryptionService.decrypt(
                    new EncryptedPayload(institution.getDekWrapped(), institution.getDekIv()), oldKek);
            EncryptedPayload rewrapped = envelopeEncryptionService.encrypt(dek, envelopeEncryptionService.kek());
            institution.setDekWrapped(rewrapped.ciphertext());
            institution.setDekIv(rewrapped.iv());
            institutionRepository.save(institution);
            count++;
        }
        return count;
    }

    private int mintMissingDekInstitutions() {
        int count = 0;
        for (Institution institution : institutionRepository.findByStatusAndDekWrappedIsNull(InstitutionStatus.APPROVED)) {
            if (mintIfMissing(institution)) {
                count++;
            }
        }
        return count;
    }

    private boolean mintIfMissing(Institution institution) {
        if (institution.getDekWrapped() != null) {
            return false;
        }
        SecretKey dek = envelopeEncryptionService.generateDek();
        EncryptedPayload wrapped = envelopeEncryptionService.encrypt(
                dek.getEncoded(), envelopeEncryptionService.kek());
        institution.setDekWrapped(wrapped.ciphertext());
        institution.setDekIv(wrapped.iv());
        institutionRepository.save(institution);
        return true;
    }

    private int encryptLegacyPlaintextFields() {
        List<CredentialField> legacy = credentialFieldRepository.findByFieldValueIvIsNull();
        if (legacy.isEmpty()) {
            return 0;
        }
        Map<UUID, UUID> credentialOwner = new HashMap<>();
        for (Credential credential : credentialRepository.findAllById(
                legacy.stream().map(CredentialField::getCredentialId).toList())) {
            credentialOwner.put(credential.getId(), credential.getInstitutionId());
        }
        Map<UUID, List<CredentialField>> byInstitution = new HashMap<>();
        for (CredentialField field : legacy) {
            UUID owner = credentialOwner.get(field.getCredentialId());
            if (owner != null) {
                byInstitution.computeIfAbsent(owner, k -> new ArrayList<>()).add(field);
            }
        }
        int count = 0;
        for (Map.Entry<UUID, List<CredentialField>> entry : byInstitution.entrySet()) {
            Institution owner = institutionRepository.findById(entry.getKey())
                    .orElseThrow(() -> new IllegalStateException("Institution not found: " + entry.getKey()));
            mintIfMissing(owner);
            for (CredentialField field : entry.getValue()) {
                credentialFieldCryptoService.encryptForStorage(field, owner.getId());
            }
            credentialFieldRepository.saveAll(entry.getValue());
            count += entry.getValue().size();
        }
        return count;
    }
}