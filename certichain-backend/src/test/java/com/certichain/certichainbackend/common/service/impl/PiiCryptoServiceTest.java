package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.enums.DisputeStatus;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.support.TestCrypto;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/** PII envelope round trips, blind-index determinism, and copy-helper sanitization. */
class PiiCryptoServiceTest {

    private final PiiCryptoService pii = TestCrypto.pii();
    private final UUID instId = UUID.randomUUID();

    @Test
    void userFieldRoundTrip() {
        String enc = pii.encryptUserField("Ada");
        assertNotEquals("Ada", enc);
        assertTrue(PiiCryptoService.looksEncrypted(enc));
        assertEquals("Ada", pii.decryptUserField(enc));
    }

    @Test
    void nullsPassThrough() {
        assertNull(pii.encryptUserField(null));
        assertNull(pii.decryptUserField(null));
        assertNull(pii.emailHmac(null));
    }

    @Test
    void legacyPlaintextReadsThroughUntilBackfilled() {
        assertEquals("plain name", pii.decryptUserField("plain name"));
        assertEquals("plain reason", pii.decryptInstitutionField("plain reason", instId));
    }

    @Test
    void emailHmacIsDeterministicAndNormalized() {
        assertEquals(pii.emailHmac("a@x.com"), pii.emailHmac("  A@X.COM "));
        assertNotEquals(pii.emailHmac("a@x.com"), pii.emailHmac("b@x.com"));
        assertEquals(64, pii.emailHmac("a@x.com").length());
    }

    @Test
    void looksEncryptedRejectsEverydayPlaintext() {
        assertFalse(PiiCryptoService.looksEncrypted("registrar@uit.edu.mm"));
        assertFalse(PiiCryptoService.looksEncrypted("12/YGN(N)123456"));
        assertFalse(PiiCryptoService.looksEncrypted("+95 1 640 032"));
        assertFalse(PiiCryptoService.looksEncrypted("Incorrect details: wrong date"));
        assertFalse(PiiCryptoService.looksEncrypted("St. John"));
        assertFalse(PiiCryptoService.looksEncrypted(null));
        assertFalse(PiiCryptoService.looksEncrypted("short.x"));
    }

    @Test
    void jsonHelpersKeepEmptyDocumentsPlain() {
        assertEquals("[]", pii.encryptJson("[]", instId));
        assertEquals("[]", pii.decryptJson("[]", instId));
        String enc = pii.encryptJson("[{\"fullName\":\"U Ba\"}]", instId);
        assertTrue(enc.startsWith("\"") && enc.endsWith("\""));
        assertEquals("[{\"fullName\":\"U Ba\"}]", pii.decryptJson(enc, instId));
    }

    @Test
    void decryptedCopiesNeverMutateTheSource() {
        Credential c = Credential.builder().id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE).institutionId(instId)
                .graduateEmail(pii.encryptUserField("g@x.com"))
                .status(CredentialStatus.ISSUED).issuedAt(Instant.now()).build();
        Credential copy = pii.decryptedCredentialCopy(c);
        assertEquals("g@x.com", copy.getGraduateEmail());
        assertTrue(PiiCryptoService.looksEncrypted(c.getGraduateEmail()));

        DisputeFlag f = DisputeFlag.builder().id(UUID.randomUUID())
                .credentialId(c.getId()).graduateUserId(UUID.randomUUID())
                .reason(pii.encryptInstitutionField("Not my credential", instId))
                .status(DisputeStatus.OPEN).createdAt(Instant.now()).build();
        assertEquals("Not my credential", pii.decryptedFlagCopy(f, instId).getReason());
        assertTrue(PiiCryptoService.looksEncrypted(f.getReason()));
    }

    @Test
    void publicDirectoryCopyNullsPiiButKeepsPublicFields() {
        Institution e = Institution.builder().id(instId).name("UIT")
                .phone(pii.encryptInstitutionField("+95 1", instId))
                .website("https://uit.edu.mm").brandColor("#00629B")
                .founders(pii.encryptJson("[{\"fullName\":\"U Ba\"}]", instId))
                .status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build();

        Institution pub = pii.publicDirectoryCopy(e);

        assertNull(pub.getPhone());
        assertNull(pub.getFounders());
        assertNull(pub.getAdministrator());
        assertEquals("UIT", pub.getName());
        assertEquals("UIT", pub.getName());
        assertEquals("https://uit.edu.mm", pub.getWebsite());
        assertEquals("#00629B", pub.getBrandColor());
    }

    @Test
    void bytesRoundTripWithIvPrefix() {
        byte[] pdf = "%PDF-1.4 fake".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] enc = pii.encryptBytes(pdf, instId);
        assertNotEquals(new String(pdf), new String(enc));
        assertEquals(new String(pdf), new String(pii.decryptBytes(enc, instId)));
    }
}
