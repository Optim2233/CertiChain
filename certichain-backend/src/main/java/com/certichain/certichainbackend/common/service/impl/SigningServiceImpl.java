package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.service.DisclosureProof;
import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.common.service.MerkleService;
import com.certichain.certichainbackend.common.service.SignedCredential;
import com.certichain.certichainbackend.common.service.SigningService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Signing implementation - INTERIM / KNOWN LIMITATION.
 *
 * <p>The Merkle root computation delegated to {@link MerkleServiceImpl} is real and
 * correct. The "signature" produced here is NOT real per-institution cryptographic
 * signing. There is currently no institution keypair schema (no public/private key
 * columns anywhere in the Institution entity or migration), so this implementation signs
 * every institution's merkle root with a single, application-wide HMAC-SHA256 secret
 * (property {@code certichain.signing.interim-hmac-secret}). This means:
 * <ul>
 *   <li>Any two institutions' credentials are indistinguishable by signature alone -
 *       the signature currently proves "signed by this backend", not "signed by this
 *       specific institution".</li>
 *   <li>Anyone with the shared secret (i.e. anyone with backend deploy access) can forge
 *       a signature for any institution.</li>
 * </ul>
 *
 * <p><b>Recommended upgrade path</b> (tracked as a Tier-2 follow-up, not solved here):
 * generate an RSA or EC keypair per institution at approval time (AA approve action),
 * encrypt the private key at rest (e.g. via a KMS or an app-level encryption key separate
 * from the DB), and sign with {@link java.security.Signature} (e.g.
 * {@code SHA256withRSA} / {@code SHA256withECDSA}) using that institution's private key
 * instead of a shared HMAC secret. Verification would then use the institution's public
 * key, which is safe to expose in the public institution directory.
 *
 * ponytail: shared-secret HMAC placeholder, upgrade to per-institution asymmetric
 * keypairs (RSA/EC) once institution key management is designed - see class doc above.
 */
@Service
@RequiredArgsConstructor
public class SigningServiceImpl implements SigningService {

    private final MerkleService merkleService;
    private final CredentialRepository credentialRepository;

    @Value("${certichain.signing.interim-hmac-secret}")
    private String hmacSecret;

    @Override
    public SignedCredential signCredential(List<Field> fields, UUID institutionId) {
        List<SignedCredential.FieldWithIndex> indexed = new ArrayList<>();
        for (int i = 0; i < fields.size(); i++) {
            Field f = fields.get(i);
            indexed.add(new SignedCredential.FieldWithIndex(f.name(), f.value(), i));
        }

        String root = merkleService.computeRoot(fields);
        String signature = hmac(root + "|" + institutionId);
        return new SignedCredential(root, signature, indexed);
    }

    @Override
    public VerificationResult verify(UUID credentialId, Map<String, String> disclosedFields,
                                      List<DisclosureProof.ProofStep> proofPath) {
        Optional<Credential> credentialOpt = credentialRepository.findById(credentialId);
        if (credentialOpt.isEmpty()) {
            return VerificationResult.INVALID_NOT_FOUND;
        }

        Credential credential = credentialOpt.get();
        if (credential.getStatus() == CredentialStatus.REVOKED) {
            return VerificationResult.REVOKED;
        }

        String expectedSignature = hmac(credential.getMerkleRoot() + "|" + credential.getInstitutionId());
        if (!expectedSignature.equals(credential.getSignature())) {
            return VerificationResult.INVALID_NOT_FOUND;
        }

        List<DisclosureProof.DisclosedField> disclosed = disclosedFields.entrySet().stream()
                .map(e -> new DisclosureProof.DisclosedField(e.getKey(), e.getValue(), 0))
                .toList();
        DisclosureProof proof = new DisclosureProof(credential.getMerkleRoot(), disclosed, proofPath);

        boolean valid = merkleService.verifyDisclosure(credential.getMerkleRoot(), proof);
        return valid ? VerificationResult.VERIFIED : VerificationResult.INVALID_NOT_FOUND;
    }

    private String hmac(String input) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(hmacSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return Base64.getEncoder().encodeToString(mac.doFinal(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Failed to compute HMAC signature", e);
        }
    }
}
