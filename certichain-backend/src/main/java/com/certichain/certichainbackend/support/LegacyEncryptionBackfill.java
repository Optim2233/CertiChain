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
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;

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
 *
 * <p>Chunked + per-institution isolated (no single transaction): each page of legacy
 * fields and each institution commits independently, one bad row/DEK is quarantined
 * (counted + logged, never aborts the run), and orphan rows whose credential is gone
 * are skipped so they can never block progress.
 */
@Component
@ConditionalOnProperty(name = "app.backfill.legacy-encryption", havingValue = "true")
public class LegacyEncryptionBackfill implements CommandLineRunner {

    // ponytail: fixed page size, no config - add one if 500 ever proves wrong.
    private static final int PAGE_SIZE = 500;

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
    public void run(String... args) {
        // Dry-run counts first so operators see the scope before any write happens.
        System.out.println("[backfill] dry-run - DEK-less APPROVED: "
                + institutionRepository.findByStatusAndDekWrappedIsNull(InstitutionStatus.APPROVED).size()
                + ", legacy plaintext fields: " + credentialFieldRepository.countByFieldValueIvIsNull());
        int rewrapped = 0, rewrapErrors = 0;
        int[] rewrap = rewrapExistingDekInstitutions();
        rewrapped = rewrap[0];
        rewrapErrors = rewrap[1];
        int minted = mintMissingDekInstitutions();
        int[] encrypted = encryptLegacyPlaintextFields();
        System.out.println("[backfill] done - DEKs re-wrapped: " + rewrapped
                + " (errors: " + rewrapErrors + "), DEKs minted: " + minted
                + ", plaintext fields encrypted: " + encrypted[0]
                + " (errors: " + encrypted[1] + ", orphans skipped: " + encrypted[2] + ")");
    }

    private int[] rewrapExistingDekInstitutions() {
        if (previousKek == null || previousKek.isBlank()) {
            return new int[]{0, 0};
        }
        byte[] currentKekBytes = envelopeEncryptionService.kek().getEncoded();
        byte[] previousKekBytes = previousKek.getBytes(StandardCharsets.UTF_8);
        if (Arrays.equals(currentKekBytes, previousKekBytes)) {
            return new int[]{0, 0};
        }
        SecretKey oldKek = new SecretKeySpec(previousKekBytes, "AES");
        int count = 0, errors = 0;
        for (Institution institution : institutionRepository.findByDekWrappedIsNotNull()) {
            try {
                byte[] dek = envelopeEncryptionService.decrypt(
                        new EncryptedPayload(institution.getDekWrapped(), institution.getDekIv()), oldKek);
                EncryptedPayload rewrapped = envelopeEncryptionService.encrypt(dek, envelopeEncryptionService.kek());
                institution.setDekWrapped(rewrapped.ciphertext());
                institution.setDekIv(rewrapped.iv());
                institutionRepository.save(institution);
                count++;
            } catch (RuntimeException e) {
                errors++;
                System.err.println("[backfill] rewrap FAILED for institution "
                        + institution.getId() + ": " + e.getMessage());
            }
        }
        return new int[]{count, errors};
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

    private int[] encryptLegacyPlaintextFields() {
        int encrypted = 0, errors = 0, orphans = 0;
        // Always page 0: each committed page leaves the NULL-IV result set, so page 0
        // is the next unprocessed chunk. Resumable - a restart re-reads what's left.
        while (true) {
            Page<CredentialField> page =
                    credentialFieldRepository.findByFieldValueIvIsNull(PageRequest.of(0, PAGE_SIZE));
            List<CredentialField> legacy = page.getContent();
            if (legacy.isEmpty()) {
                break;
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
                } else {
                    orphans++;
                    System.err.println("[backfill] orphan field skipped (credential gone): " + field.getId());
                }
            }
            for (Map.Entry<UUID, List<CredentialField>> entry : byInstitution.entrySet()) {
                try {
                    Institution owner = institutionRepository.findById(entry.getKey())
                            .orElseThrow(() -> new IllegalStateException("Institution not found: " + entry.getKey()));
                    mintIfMissing(owner);
                    List<CredentialField> ok = new ArrayList<>();
                    for (CredentialField field : entry.getValue()) {
                        try {
                            credentialFieldCryptoService.encryptForStorage(field, owner.getId());
                            ok.add(field);
                        } catch (RuntimeException e) {
                            errors++;
                            System.err.println("[backfill] encrypt FAILED for field "
                                    + field.getId() + ": " + e.getMessage());
                        }
                    }
                    credentialFieldRepository.saveAll(ok);
                    encrypted += ok.size();
                } catch (RuntimeException e) {
                    errors += entry.getValue().size();
                    System.err.println("[backfill] institution chunk FAILED for "
                            + entry.getKey() + ": " + e.getMessage());
                }
            }
            if (byInstitution.isEmpty()) {
                // Nothing on this page is processable (all orphans, which never leave
                // the NULL-IV set) - stop rather than re-fetching the same page forever.
                break;
            }
        }
        return new int[]{encrypted, errors, orphans};
    }
}
