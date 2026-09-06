package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.DisputeFlagRepository;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.repository.NotificationRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.common.service.impl.CredentialFieldCryptoService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * One-time backfill for rows that predate PII envelope encryption: encrypts user profile
 * data + emails (with HMAC blind index), institution PII + founders/admin JSON, credential
 * emails, dispute text, notification bodies and legacy inline PDFs.
 *
 * <p>Gated off by default; run once per environment with {@code BACKFILL_PII_ENCRYPTION=true},
 * then leave it off. Safe to re-run: users/credentials are skipped once their HMAC column
 * is set, everything else is skipped once values match the ciphertext shape, and plaintext
 * PDFs are detected by their {@code %PDF} magic. Institutions that never got a DEK
 * (rejected/pending applicants predate apply-time minting) get one minted here.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.backfill.pii-encryption", havingValue = "true")
public class PiiBackfill implements CommandLineRunner {

    private static final int PAGE_SIZE = 500;

    private final UserRepository userRepository;
    private final CredentialRepository credentialRepository;
    private final InstitutionRepository institutionRepository;
    private final DisputeFlagRepository disputeFlagRepository;
    private final NotificationRepository notificationRepository;
    private final InstitutionDocumentRepository institutionDocumentRepository;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final EnvelopeEncryptionService envelopeEncryptionService;
    private final PiiCryptoService piiCryptoService;

    @Override
    public void run(String... args) {
        int users = backfillUsers();
        int creds = backfillCredentials();
        int insts = backfillInstitutions();
        int flags = backfillDisputes();
        int notifs = backfillNotifications();
        int docs = backfillDocuments();
        log.warn("[backfill] PII done - users={} credentials={} institutions={} disputes={} "
                + "notifications={} documents={} (0 = already encrypted, re-run safe)",
                users, creds, insts, flags, notifs, docs);
    }

    private int backfillUsers() {
        int done = 0;
        Page<User> page;
        int p = 0;
        do {
            page = userRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (User u : page.getContent()) {
                if (u.getEmailHmac() != null) continue;
                try {
                    String norm = PiiCryptoService.normalizeEmail(
                            PiiCryptoService.looksEncrypted(u.getEmail()) ? null : u.getEmail());
                    if (norm == null) continue; // cannot recover canonical email - quarantined
                    u.setEmail(piiCryptoService.encryptUserField(norm));
                    u.setEmailHmac(piiCryptoService.emailHmac(norm));
                    if (!PiiCryptoService.looksEncrypted(u.getFirstName())) {
                        u.setFirstName(piiCryptoService.encryptUserField(u.getFirstName()));
                    }
                    if (!PiiCryptoService.looksEncrypted(u.getLastName())) {
                        u.setLastName(piiCryptoService.encryptUserField(u.getLastName()));
                    }
                    if (!PiiCryptoService.looksEncrypted(u.getPhone())) {
                        u.setPhone(piiCryptoService.encryptUserField(u.getPhone()));
                    }
                    userRepository.save(u);
                    done++;
                } catch (RuntimeException e) {
                    log.warn("[backfill] user {} skipped: {}", u.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }

    private int backfillCredentials() {
        int done = 0;
        Page<Credential> page;
        int p = 0;
        do {
            page = credentialRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (Credential c : page.getContent()) {
                if (c.getGraduateEmailHmac() != null) continue;
                try {
                    String norm = PiiCryptoService.normalizeEmail(
                            PiiCryptoService.looksEncrypted(c.getGraduateEmail())
                                    ? null : c.getGraduateEmail());
                    if (norm == null) continue;
                    c.setGraduateEmail(piiCryptoService.encryptUserField(norm));
                    c.setGraduateEmailHmac(piiCryptoService.emailHmac(norm));
                    if (c.getRevokeReason() != null
                            && !PiiCryptoService.looksEncrypted(c.getRevokeReason())) {
                        c.setRevokeReason(piiCryptoService.encryptInstitutionField(
                                c.getRevokeReason(), c.getInstitutionId()));
                    }
                    credentialRepository.save(c);
                    done++;
                } catch (RuntimeException e) {
                    log.warn("[backfill] credential {} skipped: {}", c.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }

    private int backfillInstitutions() {
        int done = 0;
        // DEK-less institutions (rejected/pending, predate apply-time minting) first.
        for (Institution i : institutionRepository.findByDekWrappedIsNull()) {
            try {
                SecretKey dek = credentialFieldCryptoService.generateDek();
                EncryptedPayload wrapped = credentialFieldCryptoService.wrapDek(dek);
                i.setDekWrapped(wrapped.ciphertext());
                i.setDekIv(wrapped.iv());
                institutionRepository.save(i);
            } catch (RuntimeException e) {
                log.warn("[backfill] DEK mint for {} skipped: {}", i.getId(), e.getMessage());
            }
        }
        Page<Institution> page;
        int p = 0;
        do {
            page = institutionRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (Institution i : page.getContent()) {
                try {
                    boolean touched = false;
                    touched |= setInst(i, "phone", i.getPhone());
                    touched |= setInst(i, "ward", i.getWard());
                    touched |= setInst(i, "street", i.getStreet());
                    touched |= setInst(i, "postalCode", i.getPostalCode());
                    touched |= setInst(i, "establishmentDocTitle", i.getEstablishmentDocTitle());
                    touched |= setInst(i, "establishmentDocRef", i.getEstablishmentDocRef());
                    touched |= setInst(i, "companyName", i.getCompanyName());
                    touched |= setInst(i, "dica", i.getDicaCertificateNumber());
                    touched |= setInst(i, "myco", i.getMycoRegistrationNumber());
                    touched |= setInst(i, "tin", i.getTinNumber());
                    touched |= setInst(i, "mic", i.getMicPermitNumber());
                    touched |= setInst(i, "statusReason", i.getStatusReason());
                    String founders = piiCryptoService.encryptJson(
                            needsJsonEncrypt(i.getFounders()) ? i.getFounders() : null, i.getId());
                    if (founders != null && !founders.equals(i.getFounders())) {
                        i.setFounders(founders);
                        touched = true;
                    }
                    String admin = piiCryptoService.encryptJson(
                            needsJsonEncrypt(i.getAdministrator()) ? i.getAdministrator() : null,
                            i.getId());
                    if (admin != null && !admin.equals(i.getAdministrator())) {
                        i.setAdministrator(admin);
                        touched = true;
                    }
                    if (touched) {
                        institutionRepository.save(i);
                        done++;
                    }
                } catch (RuntimeException e) {
                    log.warn("[backfill] institution {} skipped: {}", i.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }

    /** Encrypt one institution text field in place if it still looks like plaintext. */
    private boolean setInst(Institution i, String which, String value) {
        if (value == null || PiiCryptoService.looksEncrypted(value)) return false;
        String enc = piiCryptoService.encryptInstitutionField(value, i.getId());
        switch (which) {
            case "phone" -> i.setPhone(enc);
            case "ward" -> i.setWard(enc);
            case "street" -> i.setStreet(enc);
            case "postalCode" -> i.setPostalCode(enc);
            case "establishmentDocTitle" -> i.setEstablishmentDocTitle(enc);
            case "establishmentDocRef" -> i.setEstablishmentDocRef(enc);
            case "companyName" -> i.setCompanyName(enc);
            case "dica" -> i.setDicaCertificateNumber(enc);
            case "myco" -> i.setMycoRegistrationNumber(enc);
            case "tin" -> i.setTinNumber(enc);
            case "mic" -> i.setMicPermitNumber(enc);
            case "statusReason" -> i.setStatusReason(enc);
            default -> { return false; }
        }
        return true;
    }

    private static boolean needsJsonEncrypt(String json) {
        if (json == null) return false;
        String t = json.trim();
        if (t.equals("[]") || t.equals("{}") || t.isEmpty()) return false;
        // already-encrypted JSON is a quoted "b64.b64" string; raw JSON starts with [ or {
        return (t.startsWith("[") || t.startsWith("{")) && !t.startsWith("\"");
    }

    private int backfillDisputes() {
        int done = 0;
        Map<UUID, UUID> instByCredential = new HashMap<>();
        Page<DisputeFlag> page;
        int p = 0;
        do {
            page = disputeFlagRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (DisputeFlag f : page.getContent()) {
                try {
                    UUID instId = instByCredential.computeIfAbsent(f.getCredentialId(), cid ->
                            credentialRepository.findById(cid).map(Credential::getInstitutionId)
                                    .orElse(null));
                    if (instId == null) continue;
                    boolean touched = false;
                    if (f.getReason() != null && !PiiCryptoService.looksEncrypted(f.getReason())) {
                        f.setReason(piiCryptoService.encryptInstitutionField(f.getReason(), instId));
                        touched = true;
                    }
                    if (f.getResolutionNote() != null
                            && !PiiCryptoService.looksEncrypted(f.getResolutionNote())) {
                        f.setResolutionNote(piiCryptoService.encryptInstitutionField(
                                f.getResolutionNote(), instId));
                        touched = true;
                    }
                    if (touched) {
                        disputeFlagRepository.save(f);
                        done++;
                    }
                } catch (RuntimeException e) {
                    log.warn("[backfill] dispute {} skipped: {}", f.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }

    private int backfillNotifications() {
        int done = 0;
        Page<Notification> page;
        int p = 0;
        do {
            page = notificationRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (Notification n : page.getContent()) {
                try {
                    if (n.getMessage() != null && !PiiCryptoService.looksEncrypted(n.getMessage())) {
                        n.setMessage(piiCryptoService.encryptUserField(n.getMessage()));
                        notificationRepository.save(n);
                        done++;
                    }
                } catch (RuntimeException e) {
                    log.warn("[backfill] notification {} skipped: {}", n.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }

    private int backfillDocuments() {
        int done = 0;
        Page<InstitutionDocument> page;
        int p = 0;
        do {
            page = institutionDocumentRepository.findAll(PageRequest.of(p++, PAGE_SIZE));
            for (InstitutionDocument d : page.getContent()) {
                try {
                    byte[] data = d.getFileData();
                    // Supabase rows (empty/url) need nothing; %PDF magic = still plaintext.
                    if (data == null || data.length == 0 || d.getFileUrl() != null) continue;
                    String magic = new String(data, 0, Math.min(4, data.length),
                            StandardCharsets.US_ASCII);
                    if (!magic.equals("%PDF")) continue; // already encrypted - re-run safe
                    d.setFileData(piiCryptoService.encryptBytes(data, d.getInstitutionId()));
                    institutionDocumentRepository.save(d);
                    done++;
                } catch (RuntimeException e) {
                    log.warn("[backfill] document {} skipped: {}", d.getId(), e.getMessage());
                }
            }
        } while (page.hasNext());
        return done;
    }
}
