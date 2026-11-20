package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.InstitutionSigningKeyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.util.Set;

/**
 * One-time backfill: mints RSA signing keypairs for institutions approved before
 * per-institution signing shipped. Also mints a DEK for any institution somehow
 * missing one (the same recovery PiiBackfill performs). Existing credentials stay
 * verifiable via the legacy HMAC fallback in SigningServiceImpl.signatureValid;
 * new issuances from these institutions are RSA from the next one on. Revoked
 * institutions are skipped - they can no longer issue, and their old credentials
 * keep verifying through the fallback.
 *
 * <p>Gated off by default; run once per environment with {@code BACKFILL_SIGNING_KEYS=true},
 * then leave it off. Safe to re-run: already-keyed institutions are skipped.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.backfill.signing-keys", havingValue = "true")
public class SigningKeyBackfill implements CommandLineRunner {

    private static final Set<InstitutionStatus> KEYED_STATUSES = Set.of(
            InstitutionStatus.APPROVED, InstitutionStatus.SUSPENDED);

    private final InstitutionRepository institutionRepository;
    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final InstitutionSigningKeyService institutionSigningKeyService;

    @Override
    @Transactional
    public void run(String... args) {
        int minted = 0;
        int skipped = 0;
        for (Institution institution : institutionRepository.findAll()) {
            if (!KEYED_STATUSES.contains(institution.getStatus())
                    || institution.getPublicKey() != null) {
                skipped++;
                continue;
            }
            SecretKey dek = null;
            if (institution.getDekWrapped() == null) {
                dek = envelopeEncryptionService.generateDek();
                EncryptedPayload wrapped = envelopeEncryptionService.encrypt(
                        dek.getEncoded(), envelopeEncryptionService.kek());
                institution.setDekWrapped(wrapped.ciphertext());
                institution.setDekIv(wrapped.iv());
            }
            SecretKey keyDek = dek != null
                    ? dek : credentialFieldCryptoService.institutionDek(institution.getId());
            InstitutionSigningKeyService.GeneratedKeys keys =
                    institutionSigningKeyService.generate(keyDek);
            institution.setPublicKey(keys.publicKey());
            institution.setPrivateKeyEnc(keys.privateKeyEnc());
            institution.setKeyAlgorithm(InstitutionSigningKeyService.KEY_ALGORITHM);
            institution.setKeyGeneratedAt(Instant.now());
            minted++;
            log.info("Minted signing keypair for institution {} ({})",
                    institution.getId(), institution.getName());
        }
        log.info("SigningKeyBackfill: minted {} keypair(s), skipped {} institutions",
                minted, skipped);
    }
}
