package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.exception.StorageUnavailableException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.EncryptedPayload;
import com.certichain.certichainbackend.common.service.EnvelopeEncryptionService;
import com.certichain.certichainbackend.support.TestCrypto;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

import javax.crypto.SecretKey;
import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Supabase resilience, exercised against a real HTTP server on a real socket (JDK
 * com.sun.net.httpserver) rather than a mocked client - the point is to prove the actual
 * java.net.http.HttpClient path recovers, which a mock would assume rather than test.
 *
 * <p>Why 5xx is the focus: measured against a raw socket, HttpClient already retries
 * connection-level failures itself (5 attempts in ~92ms before surfacing one IOException)
 * but never retries a status code. So an overloaded Supabase returning 503 was the one
 * failure mode with no protection at all - and downloads had no app-level retry whatsoever,
 * which is the authority's accreditation-document path.
 */
class SupabaseStorageRetryTest {

    private static final UUID INSTITUTION = UUID.randomUUID();
    private static final byte[] DOC = "%PDF-1.4 registration certificate".getBytes(StandardCharsets.UTF_8);

    private HttpServer server;
    private String baseUrl;
    private SupabaseStorageServiceImpl service;
    private PiiCryptoService pii;
    private CredentialFieldCryptoService fieldCrypto;

    /** Every request the server received, so we can assert retry counts. */
    private final List<String> hits = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() throws IOException {
        // One envelope service shared by both crypto helpers so the DEK for INSTITUTION is
        // identical on the encrypt (upload) and decrypt (download) side.
        EnvelopeEncryptionService envelope = new EnvelopeEncryptionServiceImpl(TestCrypto.KEK);
        InstitutionRepository institutions = mock(InstitutionRepository.class);
        Map<UUID, Institution> minted = new HashMap<>();
        when(institutions.findById(any())).thenAnswer(inv -> {
            UUID id = inv.getArgument(0);
            return Optional.of(minted.computeIfAbsent(id, k -> {
                SecretKey dek = envelope.generateDek();
                EncryptedPayload w = envelope.encrypt(dek.getEncoded(), envelope.kek());
                return Institution.builder().id(k).dekWrapped(w.ciphertext()).dekIv(w.iv()).build();
            }));
        });
        fieldCrypto = new CredentialFieldCryptoService(envelope, institutions);
        pii = new PiiCryptoService(envelope, fieldCrypto, TestCrypto.HMAC_KEY);

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
        service = new SupabaseStorageServiceImpl(baseUrl, "test-service-role-key",
                "institution-profiles", "institution-documents", fieldCrypto, pii);
    }

    @AfterEach
    void tearDown() {
        if (server != null) server.stop(0);
    }

    // ---- helpers -----------------------------------------------------------------

    /** Fails with `status` for the first `failures` requests, then serves `body` with 200. */
    private void serveAfterFailures(String path, int failures, byte[] body) {
        AtomicInteger seen = new AtomicInteger();
        server.createContext(path, ex -> {
            hits.add(ex.getRequestMethod() + " " + ex.getRequestURI().getPath());
            drain(ex);
            if (seen.incrementAndGet() <= failures) {
                ex.sendResponseHeaders(503, -1);
            } else {
                ex.sendResponseHeaders(200, body.length);
                try (OutputStream os = ex.getResponseBody()) { os.write(body); }
            }
            ex.close();
        });
    }

    private void alwaysRespond(String path, int status) {
        server.createContext(path, ex -> {
            hits.add(ex.getRequestMethod() + " " + ex.getRequestURI().getPath());
            drain(ex);
            ex.sendResponseHeaders(status, -1);
            ex.close();
        });
    }

    private static void drain(HttpExchange ex) throws IOException {
        try (var in = ex.getRequestBody()) { in.readAllBytes(); }
    }

    private byte[] encryptedDoc() {
        return pii.encryptBytes(DOC, fieldCrypto.institutionDek(INSTITUTION));
    }

    private String docPath() {
        return INSTITUTION + "/registration/doc.pdf";
    }

    // ---- downloads (the path with no retry at all before this change) --------------

    @Test
    void downloadDocumentRecoversFromTransient503() {
        serveAfterFailures("/storage/v1/object/institution-documents/", 2, encryptedDoc());

        byte[] got = service.downloadDocument(INSTITUTION, docPath());

        assertArrayEquals(DOC, got, "document should round-trip after retries");
        assertEquals(3, hits.size(), "should have retried twice before succeeding");
    }

    @Test
    void downloadRawFromUrlRetriesToo() {
        // LegacyDocumentBackfill path - raw bytes, no decryption.
        byte[] raw = "legacy-bytes".getBytes(StandardCharsets.UTF_8);
        serveAfterFailures("/legacy/", 1, raw);

        byte[] got = service.downloadRawFromUrl(baseUrl + "/legacy/old.pdf");

        assertArrayEquals(raw, got);
        assertEquals(2, hits.size());
    }

    @Test
    void downloadDoesNotRetryNotFound() {
        alwaysRespond("/storage/v1/object/institution-documents/", 404);

        assertThrows(ValidationException.class,
                () -> service.downloadDocument(INSTITUTION, docPath()));

        assertEquals(1, hits.size(), "404 is final - retrying would multiply every miss");
    }

    @Test
    void downloadExhaustedRetriesReports503NotBadRequest() {
        alwaysRespond("/storage/v1/object/institution-documents/", 503);

        StorageUnavailableException ex = assertThrows(StorageUnavailableException.class,
                () -> service.downloadDocument(INSTITUTION, docPath()));

        assertEquals(503, ex.getStatus().value(),
                "an outage must not be reported to the authority as a 400 validation error");
        assertTrue(hits.size() > 1, "should have retried before giving up");
    }

    // ---- uploads -------------------------------------------------------------------

    @Test
    void uploadDocumentRecoversFromTransient503() {
        serveAfterFailures("/storage/v1/object/institution-documents/", 2, new byte[0]);

        var file = new MockMultipartFile("file", "cert.pdf", "application/pdf", DOC);
        String path = service.uploadDocument(INSTITUTION, "registration", file);

        assertTrue(path.startsWith(INSTITUTION.toString()), "returns the storage path");
        assertEquals(3, hits.size());
    }

    // ---- backoff -------------------------------------------------------------------

    @Test
    void retriesActuallySleepBetweenAttempts() {
        // The old loop retried 3x with no sleep at all, firing every attempt inside a few
        // microseconds - too fast to outlast any real blip. Assert real elapsed time.
        serveAfterFailures("/storage/v1/object/institution-documents/", 2, encryptedDoc());

        long start = System.nanoTime();
        service.downloadDocument(INSTITUTION, docPath());
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        // Two backoffs: ~200ms then ~400ms, before jitter. Allow slack for slow CI.
        assertTrue(elapsedMs >= 500,
                "expected backoff between retries, took only " + elapsedMs + "ms");
    }

    @Test
    void permanentFailureStaysBounded() {
        alwaysRespond("/storage/v1/object/institution-documents/", 503);

        long start = System.nanoTime();
        assertThrows(StorageUnavailableException.class,
                () -> service.downloadDocument(INSTITUTION, docPath()));
        long elapsedMs = (System.nanoTime() - start) / 1_000_000;

        // 4 attempts, ~1.4s of backoff plus jitter - must not pin the thread indefinitely.
        assertTrue(elapsedMs < 10_000, "dead storage should fail fast, took " + elapsedMs + "ms");
    }
}
