package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

/**
 * The one place that encrypts PII columns outside credential fields: user profile data
 * (KEK-direct, users belong to no institution), institution profile data (owning
 * institution's DEK), and emails (ciphertext + HMAC blind index for exact-match lookups).
 *
 * <p>TEXT/VARCHAR ciphertext format is {@code base64(iv) + "." + base64(ciphertext)} so no
 * sibling IV columns are needed. BYTEA payloads (legacy PDFs) are raw
 * {@code iv(12) + ciphertext} bytes. All methods are null-safe (null in, null out) -
 * nullable columns stay NULL instead of encrypting to something.
 */
@Service
// ponytail: explicit constructor (Spring's injection point) instead of
// @RequiredArgsConstructor - the hmac-key arrives as a String property while the
// field is a SecretKey, so Lombok would generate a second, ambiguous constructor.
public class PiiCryptoService {

    private static final int GCM_IV_LENGTH_BYTES = 12;

    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final SecretKey hmacKey;

    public PiiCryptoService(
            EnvelopeEncryptionService envelopeEncryptionService,
            CredentialFieldCryptoService credentialFieldCryptoService,
            @Value("${certichain.encryption.hmac-key:}") String hmacKeyValue) {
        this.envelopeEncryptionService = envelopeEncryptionService;
        this.credentialFieldCryptoService = credentialFieldCryptoService;
        byte[] keyBytes = hmacKeyValue == null ? new byte[0]
                : hmacKeyValue.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "certichain.encryption.hmac-key must be at least 32 UTF-8 bytes, got "
                            + keyBytes.length);
        }
        this.hmacKey = new SecretKeySpec(keyBytes, "HmacSHA256");
    }

    /** Canonical form for both storage-adjacent compare and HMAC - one choke point. */
    public static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    /** Hex HMAC-SHA256 of the normalized email - the blind index for encrypted-email lookups. */
    public String emailHmac(String email) {
        if (email == null) return null;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(hmacKey);
            return HexFormat.of().formatHex(
                    mac.doFinal(normalizeEmail(email).getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException("Email HMAC failed", e);
        }
    }

    /** Heuristic so the backfill (and only the backfill) can skip already-encrypted values. */
    public static boolean looksEncrypted(String value) {
        if (value == null) return false;
        int dot = value.indexOf('.');
        if (dot < 16 || dot == value.length() - 1 || value.indexOf('.', dot + 1) >= 0) return false;
        return value.chars().allMatch(c ->
                (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z') || (c >= '0' && c <= '9')
                        || c == '+' || c == '/' || c == '=' || c == '.');
    }

    // -- user-scoped (KEK-direct: users belong to no institution) --

    public String encryptUserField(String plaintext) {
        if (plaintext == null) return null;
        return encode(envelopeEncryptionService.encrypt(
                plaintext.getBytes(StandardCharsets.UTF_8), envelopeEncryptionService.kek()));
    }

    public String decryptUserField(String stored) {
        if (stored == null) return null;
        // Pre-backfill rows are still plaintext - pass through so reads keep working
        // until the one-time backfill encrypts them. Post-backfill everything matches.
        if (!looksEncrypted(stored)) return stored;
        return new String(envelopeEncryptionService.decrypt(
                decode(stored), envelopeEncryptionService.kek()), StandardCharsets.UTF_8);
    }

    // -- institution-scoped (owning institution's DEK) --

    public String encryptInstitutionField(String plaintext, UUID institutionId) {
        if (plaintext == null || institutionId == null) return plaintext;
        return encryptInstitutionField(plaintext,
                credentialFieldCryptoService.institutionDek(institutionId));
    }

    /** Key-direct variant for apply-time (DEK minted but institution not yet persisted). */
    public String encryptInstitutionField(String plaintext, SecretKey dek) {
        if (plaintext == null || dek == null) return plaintext;
        return encode(envelopeEncryptionService.encrypt(
                plaintext.getBytes(StandardCharsets.UTF_8), dek));
    }

    public String decryptInstitutionField(String stored, UUID institutionId) {
        if (stored == null || institutionId == null) return stored;
        // Same pre-backfill pass-through as decryptUserField.
        if (!looksEncrypted(stored)) return stored;
        return decryptInstitutionField(stored,
                credentialFieldCryptoService.institutionDek(institutionId));
    }

    /** Key-direct variant for apply-time responses (DEK minted in-memory, no re-read). */
    public String decryptInstitutionField(String stored, SecretKey dek) {
        if (stored == null || dek == null) return stored;
        if (!looksEncrypted(stored)) return stored;
        return new String(envelopeEncryptionService.decrypt(
                decode(stored), dek), StandardCharsets.UTF_8);
    }

    // -- raw bytes (legacy PDFs): 12-byte IV prefix + ciphertext --

    public byte[] encryptBytes(byte[] plaintext, SecretKey key) {
        if (plaintext == null) return null;
        EncryptedPayload p = envelopeEncryptionService.encrypt(plaintext, key);
        byte[] out = new byte[GCM_IV_LENGTH_BYTES + p.ciphertext().length];
        System.arraycopy(p.iv(), 0, out, 0, GCM_IV_LENGTH_BYTES);
        System.arraycopy(p.ciphertext(), 0, out, GCM_IV_LENGTH_BYTES, p.ciphertext().length);
        return out;
    }

    public byte[] decryptBytes(byte[] stored, SecretKey key) {
        if (stored == null) return null;
        byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
        byte[] ct = new byte[stored.length - GCM_IV_LENGTH_BYTES];
        System.arraycopy(stored, 0, iv, 0, GCM_IV_LENGTH_BYTES);
        System.arraycopy(stored, GCM_IV_LENGTH_BYTES, ct, 0, ct.length);
        return envelopeEncryptionService.decrypt(new EncryptedPayload(ct, iv), key);
    }

    /** Institution-DEK variant for legacy document bytes. */
    public byte[] encryptBytes(byte[] plaintext, UUID institutionId) {
        if (plaintext == null || institutionId == null) return plaintext;
        return encryptBytes(plaintext,
                credentialFieldCryptoService.institutionDek(institutionId));
    }

    /** Institution-DEK variant for legacy document bytes. */
    public byte[] decryptBytes(byte[] stored, UUID institutionId) {
        if (stored == null || institutionId == null) return stored;
        return decryptBytes(stored,
                credentialFieldCryptoService.institutionDek(institutionId));
    }

    private static String encode(EncryptedPayload p) {
        Base64.Encoder b64 = Base64.getEncoder();
        return b64.encodeToString(p.iv()) + "." + b64.encodeToString(p.ciphertext());
    }

    private static EncryptedPayload decode(String stored) {
        int dot = stored.indexOf('.');
        Base64.Decoder b64 = Base64.getDecoder();
        return new EncryptedPayload(
                b64.decode(stored.substring(dot + 1)), b64.decode(stored.substring(0, dot)));
    }

    // -- JSONB columns: whole-document ciphertext kept as a JSON string literal so the
    // column stays valid JSONB. Plain "[]" / "{}" pass through untouched (never stored). --

    public String encryptJson(String json, UUID institutionId) {
        if (json == null) return null;
        String t = json.trim();
        if (t.equals("[]") || t.equals("{}") || t.isEmpty()) return t;
        String enc = institutionId == null
                ? encryptUserField(t)
                : encryptInstitutionField(t, institutionId);
        return "\"" + enc + "\"";
    }

    /** Key-direct variant for apply-time (DEK minted but institution not yet persisted). */
    public String encryptJson(String json, SecretKey dek) {
        if (json == null) return null;
        String t = json.trim();
        if (t.equals("[]") || t.equals("{}") || t.isEmpty()) return t;
        return "\"" + encryptInstitutionField(t, dek) + "\"";
    }

    public String decryptJson(String stored, UUID institutionId) {
        if (stored == null) return null;
        String t = stored.trim();
        if (t.equals("[]") || t.equals("{}") || t.isEmpty()) return t;
        if (t.length() >= 2 && t.startsWith("\"") && t.endsWith("\"")) {
            return decryptInstitutionField(t.substring(1, t.length() - 1), institutionId);
        }
        return t; // pre-encryption row the backfill hasn't reached yet
    }

    /** Key-direct variant for apply-time responses (DEK minted in-memory, no re-read). */
    public String decryptJson(String stored, SecretKey dek) {
        if (stored == null) return null;
        String t = stored.trim();
        if (t.equals("[]") || t.equals("{}") || t.isEmpty()) return t;
        if (t.length() >= 2 && t.startsWith("\"") && t.endsWith("\"")) {
            return decryptInstitutionField(t.substring(1, t.length() - 1), dek);
        }
        return t;
    }

    /**
     * Detached copy of a dispute flag with text decrypted under the issuing institution's
     * DEK (same key as revoke reasons). Callers map credentialId -&gt; institutionId.
     */
    public DisputeFlag decryptedFlagCopy(DisputeFlag f, UUID institutionId) {
        if (f == null) return null;
        return DisputeFlag.builder()
                .id(f.getId()).credentialId(f.getCredentialId())
                .graduateUserId(f.getGraduateUserId())
                .reason(decryptInstitutionField(f.getReason(), institutionId))
                .status(f.getStatus())
                .resolutionNote(decryptInstitutionField(f.getResolutionNote(), institutionId))
                .createdAt(f.getCreatedAt()).resolvedAt(f.getResolvedAt())
                .updatedAt(f.getUpdatedAt()).version(f.getVersion())
                .build();
    }

    /**
     * Detached copy of a credential with PII decrypted (graduate email under the KEK,
     * revoke reason under the owning institution's DEK). Same copy-not-mutate rule as
     * {@link #decryptedCopy(Institution)}.
     */
    public Credential decryptedCredentialCopy(Credential c) {
        if (c == null) return null;
        return Credential.builder()
                .id(c.getId()).type(c.getType()).institutionId(c.getInstitutionId())
                .graduateUserId(c.getGraduateUserId())
                .graduateEmail(decryptUserField(c.getGraduateEmail()))
                .graduateEmailHmac(c.getGraduateEmailHmac())
                .batchId(c.getBatchId()).status(c.getStatus())
                .revokeReason(c.getRevokeReason() == null ? null
                        : decryptInstitutionField(c.getRevokeReason(), c.getInstitutionId()))
                .revokedAt(c.getRevokedAt()).merkleRoot(c.getMerkleRoot())
                .signature(c.getSignature()).issuedAt(c.getIssuedAt()).expiresAt(c.getExpiresAt())
                .updatedAt(c.getUpdatedAt()).version(c.getVersion())
                .build();
    }

    /**
     * Public-directory view: only fields the unauthenticated verify directory may show.
     * PII (phone, street-level address, business IDs, founders/admin, reasons) is nulled,
     * never decrypted - the public must not see it in either form.
     */
    public Institution publicDirectoryCopy(Institution e) {
        if (e == null) return null;
        return Institution.builder()
                .id(e.getId()).name(e.getName()).ministry(e.getMinistry())
                .institutionType(e.getInstitutionType()).institutionNameMm(e.getInstitutionNameMm())
                .institutionCategory(e.getInstitutionCategory())
                .stateRegion(e.getStateRegion()).district(e.getDistrict()).township(e.getTownship())
                .yearEstablished(e.getYearEstablished())
                .dicaCertificateUrl(null)
                .taxClearanceUrl(null)
                .micPermitUrl(null)
                .founders(null)
                .administrator(null)
                .status(e.getStatus()).appliedAt(e.getAppliedAt()).decidedAt(e.getDecidedAt())
                .publicKey(e.getPublicKey()).keyAlgorithm(e.getKeyAlgorithm())
                .keyGeneratedAt(e.getKeyGeneratedAt()).website(e.getWebsite())
                .profileImageUrl(e.getProfileImageUrl())
                .brandColor(e.getBrandColor()).accentPattern(e.getAccentPattern())
                .secondaryBrandColor(e.getSecondaryBrandColor()).accentColor(e.getAccentColor())
                .watermarkOpacity(e.getWatermarkOpacity()).patternScale(e.getPatternScale())
                .cardRadius(e.getCardRadius()).titleFont(e.getTitleFont())
                .logoShape(e.getLogoShape())
                .medalStyle(e.getMedalStyle()).medalShape(e.getMedalShape())
                .medalPosition(e.getMedalPosition()).medalIcon(e.getMedalIcon())
                .medalSize(e.getMedalSize()).watermarkIcon(e.getWatermarkIcon())
                .updatedAt(e.getUpdatedAt()).version(e.getVersion())
                .build();
    }

    /**
     * Detached copy of an institution with PII decrypted - pass this (never the managed
     * entity) to response factories, so ciphertext never leaks and plaintext can never
     * be flushed back by JPA dirty checking.
     */
    public Institution decryptedCopy(Institution e) {
        return decryptedCopy(e, null);
    }

    /**
     * Key-direct variant for apply-time responses: decrypts with the just-minted DEK
     * instead of re-unwrapping from storage.
     */
    public Institution decryptedCopy(Institution e, SecretKey dek) {
        if (e == null) return null;
        UUID id = e.getId();
        return Institution.builder()
                .id(e.getId()).name(e.getName()).ministry(e.getMinistry())
                .institutionType(e.getInstitutionType()).institutionNameMm(e.getInstitutionNameMm())
                .institutionCategory(e.getInstitutionCategory())
                .stateRegion(e.getStateRegion()).district(e.getDistrict()).township(e.getTownship())
                .ward(decInst(e.getWard(), id, dek))
                .street(decInst(e.getStreet(), id, dek))
                .postalCode(decInst(e.getPostalCode(), id, dek))
                .yearEstablished(e.getYearEstablished())
                .establishmentDocType(e.getEstablishmentDocType())
                .establishmentDocTitle(decInst(e.getEstablishmentDocTitle(), id, dek))
                .establishmentDocRef(decInst(e.getEstablishmentDocRef(), id, dek))
                .establishmentDocIssueDate(e.getEstablishmentDocIssueDate())
                .establishmentDocUrl(e.getEstablishmentDocUrl())
                .companyName(decInst(e.getCompanyName(), id, dek))
                .dicaCertificateNumber(decInst(e.getDicaCertificateNumber(), id, dek))
                .mycoRegistrationNumber(decInst(e.getMycoRegistrationNumber(), id, dek))
                .tinNumber(decInst(e.getTinNumber(), id, dek))
                .incorporationDate(e.getIncorporationDate())
                .ownershipStructure(e.getOwnershipStructure())
                .investmentAmount(e.getInvestmentAmount())
                .foreignInvolvement(e.getForeignInvolvement())
                .micPermitNumber(decInst(e.getMicPermitNumber(), id, dek))
                .dicaCertificateUrl(e.getDicaCertificateUrl())
                .taxClearanceUrl(e.getTaxClearanceUrl())
                .micPermitUrl(e.getMicPermitUrl())
                .founders(decJson(e.getFounders(), id, dek))
                .administrator(decJson(e.getAdministrator(), id, dek))
                .status(e.getStatus())
                .statusReason(decInst(e.getStatusReason(), id, dek))
                .appliedAt(e.getAppliedAt()).decidedAt(e.getDecidedAt())
                .publicKey(e.getPublicKey()).privateKeyEnc(e.getPrivateKeyEnc())
                .keyAlgorithm(e.getKeyAlgorithm()).keyGeneratedAt(e.getKeyGeneratedAt())
                .phone(decInst(e.getPhone(), id, dek))
                .website(e.getWebsite()).profileImageUrl(e.getProfileImageUrl())
                .brandColor(e.getBrandColor()).accentPattern(e.getAccentPattern())
                .secondaryBrandColor(e.getSecondaryBrandColor()).accentColor(e.getAccentColor())
                .watermarkOpacity(e.getWatermarkOpacity()).patternScale(e.getPatternScale())
                .cardRadius(e.getCardRadius()).titleFont(e.getTitleFont())
                .logoShape(e.getLogoShape())
                .medalStyle(e.getMedalStyle()).medalShape(e.getMedalShape())
                .medalPosition(e.getMedalPosition()).medalIcon(e.getMedalIcon())
                .medalSize(e.getMedalSize()).watermarkIcon(e.getWatermarkIcon())
                .dekWrapped(e.getDekWrapped()).dekIv(e.getDekIv())
                .updatedAt(e.getUpdatedAt()).version(e.getVersion())
                .build();
    }

    private String decInst(String v, UUID id, SecretKey dek) {
        return dek != null ? decryptInstitutionField(v, dek) : decryptInstitutionField(v, id);
    }

    private String decJson(String v, UUID id, SecretKey dek) {
        return dek != null ? decryptJson(v, dek) : decryptJson(v, id);
    }
}
