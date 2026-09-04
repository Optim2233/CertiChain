package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * The one place that turns a plaintext credential field value into what actually gets stored
 * (Base64 ciphertext + IV) and back. Every other service reads/writes plaintext values as if
 * encryption didn't exist - this is the only class that knows otherwise.
 *
 * <p>Read methods return brand-new {@link CredentialField} copies rather than mutating the
 * managed entity loaded from the repository - deliberately, so a decrypted (plaintext) value
 * can never accidentally get flushed back into the ciphertext column by JPA's dirty checking.
 */
@Service
@RequiredArgsConstructor
public class CredentialFieldCryptoService {

    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final InstitutionRepository institutionRepository;

    /**
     * Mutates {@code field} in place, replacing its plaintext {@code fieldValue} with
     * Base64 ciphertext and setting {@code fieldValueIv}. Only call this on a field you're
     * about to save - never on one you loaded to read.
     */
    public void encryptForStorage(CredentialField field, UUID institutionId) {
        SecretKey dek = unwrapDek(institutionId);
        EncryptedPayload payload = envelopeEncryptionService.encrypt(
                field.getFieldValue().getBytes(StandardCharsets.UTF_8), dek);
        field.setFieldValue(Base64.getEncoder().encodeToString(payload.ciphertext()));
        field.setFieldValueIv(payload.iv());
    }

    /** Single-field convenience wrapper around {@link #decrypted(List, UUID)}. */
    public CredentialField decrypted(CredentialField field, UUID institutionId) {
        return decrypted(List.of(field), institutionId).get(0);
    }

    /**
     * Returns new {@link CredentialField} instances with plaintext {@code fieldValue} and no
     * IV - never persist these. Unwraps the institution's DEK once for the whole list rather
     * than once per field.
     */
    public List<CredentialField> decrypted(List<CredentialField> fields, UUID institutionId) {
        if (fields.isEmpty()) {
            return fields;
        }
        SecretKey dek = unwrapDek(institutionId);
        return fields.stream().map(f -> decryptedWithKey(f, dek)).toList();
    }

    private CredentialField decryptedWithKey(CredentialField field, SecretKey dek) {
        byte[] ciphertext = Base64.getDecoder().decode(field.getFieldValue());
        byte[] plaintext = envelopeEncryptionService.decrypt(
                new EncryptedPayload(ciphertext, field.getFieldValueIv()), dek);
        return CredentialField.builder()
                .id(field.getId())
                .credentialId(field.getCredentialId())
                .fieldName(field.getFieldName())
                .fieldValue(new String(plaintext, StandardCharsets.UTF_8))
                .merkleIndex(field.getMerkleIndex())
                .build();
    }

    /**
     * Decrypts a batch of "title" field rows - fetched straight from the DB so their
     * {@code fieldValue} is still Base64 ciphertext - into a credentialId → plaintext
     * title map. The rows here sit under different institutions (graduate timeline,
     * disputes, analytics all span issuers), so the DEK is unwrapped once per
     * owning institution rather than once per title.
     *
     * @param credentialToInstitution  maps each title row's credentialId to its issuing institution
     * @param titleFields              "title" rows loaded without going through {@link #decrypted}
     */
    public Map<UUID, String> decryptedTitlesByCredential(Map<UUID, UUID> credentialToInstitution,
                                                         List<CredentialField> titleFields) {
        Map<UUID, List<CredentialField>> byInstitution = new HashMap<>();
        for (CredentialField field : titleFields) {
            UUID institutionId = credentialToInstitution.get(field.getCredentialId());
            if (institutionId != null) {
                byInstitution.computeIfAbsent(institutionId, k -> new ArrayList<>()).add(field);
            }
        }
        Map<UUID, String> titles = new HashMap<>();
        byInstitution.forEach((institutionId, fields) -> {
            for (CredentialField field : decrypted(fields, institutionId)) {
                titles.put(field.getCredentialId(), field.getFieldValue());
            }
        });
        return titles;
    }

    private SecretKey unwrapDek(UUID institutionId) {
        Institution institution = institutionRepository.findById(institutionId)
                .orElseThrow(() -> new IllegalStateException("Institution not found: " + institutionId));
        if (institution.getDekWrapped() == null || institution.getDekIv() == null) {
            throw new IllegalStateException(
                    "Institution " + institutionId + " has no DEK yet - it was approved before "
                            + "encryption shipped and needs the one-time backfill run against it.");
        }
        byte[] rawDek = envelopeEncryptionService.decrypt(
                new EncryptedPayload(institution.getDekWrapped(), institution.getDekIv()),
                envelopeEncryptionService.kek());
        return new SecretKeySpec(rawDek, "AES");
    }
}
