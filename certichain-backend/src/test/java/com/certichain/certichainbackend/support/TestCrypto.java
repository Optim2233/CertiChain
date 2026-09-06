package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.EnvelopeEncryptionServiceImpl;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;

import javax.crypto.SecretKey;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Real (non-mock) PII crypto for unit tests: deterministic HMAC (assertable) with random
 * IVs per encryption (round-trip assertable, ciphertext-equality is not). Institution DEKs
 * are minted once per id and cached, so encrypt-then-decrypt in one test uses one key.
 */
public final class TestCrypto {

    private TestCrypto() {}

    public static final String KEK = "0123456789ABCDEF0123456789ABCDEF";
    public static final String HMAC_KEY = "0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF";

    public static PiiCryptoService pii() {
        EnvelopeEncryptionService envelope = new EnvelopeEncryptionServiceImpl(KEK);
        InstitutionRepository institutions = mock(InstitutionRepository.class);
        Map<UUID, Institution> minted = new HashMap<>();
        when(institutions.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.of(minted.computeIfAbsent(id, k -> {
                SecretKey dek = envelope.generateDek();
                EncryptedPayload w = envelope.encrypt(dek.getEncoded(), envelope.kek());
                return Institution.builder().id(k)
                        .dekWrapped(w.ciphertext()).dekIv(w.iv()).build();
            }));
        });
        return new PiiCryptoService(
                envelope, new CredentialFieldCryptoService(envelope, institutions), HMAC_KEY);
    }
}
