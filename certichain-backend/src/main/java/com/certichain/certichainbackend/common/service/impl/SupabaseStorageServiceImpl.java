package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.exception.StorageUnavailableException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.service.SupabaseStorageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class SupabaseStorageServiceImpl implements SupabaseStorageService {

    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");
    private static final long MAX_SIZE = 5 * 1024 * 1024;
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    // 4 attempts => at most ~1.4s of backoff on top of the per-request timeout, so a dead
    // Supabase fails in bounded time instead of pinning the request thread.
    private static final int MAX_ATTEMPTS = 4;
    private static final long BASE_BACKOFF_MS = 200;

    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucket;
    // Documents (institution registration proofs) hold real PII/business identity docs and
    // must never be publicly fetchable - kept in a separate, private bucket from
    // institution-profiles (logos, which are meant to be public).
    private final String documentsBucket;
    private final boolean configured;
    private final CredentialFieldCryptoService credentialFieldCryptoService;
    private final PiiCryptoService piiCryptoService;

    public SupabaseStorageServiceImpl(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.bucket:institution-profiles}") String bucket,
            @Value("${supabase.documents-bucket:institution-documents}") String documentsBucket,
            CredentialFieldCryptoService credentialFieldCryptoService,
            PiiCryptoService piiCryptoService) {
        this.supabaseUrl = supabaseUrl != null ? supabaseUrl.trim().replaceAll("/$", "") : "";
        this.serviceRoleKey = serviceRoleKey != null ? serviceRoleKey.trim() : "";
        this.bucket = bucket != null && !bucket.isBlank() ? bucket.trim() : "institution-profiles";
        this.documentsBucket = documentsBucket != null && !documentsBucket.isBlank() ? documentsBucket.trim() : "institution-documents";
        this.configured = !this.supabaseUrl.isBlank() && !this.serviceRoleKey.isBlank();
        this.credentialFieldCryptoService = credentialFieldCryptoService;
        this.piiCryptoService = piiCryptoService;
        if (!configured) {
            log.warn("Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) - profile image uploads will require a direct URL or will fail if a file is sent");
        } else {
            log.info("Supabase storage configured: url={} bucket={} documentsBucket={}", this.supabaseUrl, this.bucket, this.documentsBucket);
        }
    }

    @Override
    public String uploadDocument(UUID institutionId, String docKind, MultipartFile file) {
        if (file == null || file.isEmpty()) throw new ValidationException("Document file is empty");
        if (file.getSize() > 10L * 1024 * 1024) throw new ValidationException("Document too large (max 10MB)");
        String ct = file.getContentType();
        if (ct != null && !ct.equals("application/pdf") && !ct.equals("application/octet-stream")) {
            throw new ValidationException("Only PDF documents are accepted");
        }
        if (!configured) {
            // dev fallback: store inline is now handled by caller; here we just fail with clear message
            throw new ValidationException("Supabase storage is not configured - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        }
        byte[] plaintext;
        try {
            plaintext = file.getBytes();
        } catch (java.io.IOException ioe) {
            throw new ValidationException("Failed to read document: " + ioe.getMessage());
        }
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : docKind + ".pdf";
        return encryptAndUpload(institutionId, docKind, original, plaintext);
    }

    @Override
    public String migrateDocument(UUID institutionId, String docKind, String originalFileName, byte[] plaintext) {
        return encryptAndUpload(institutionId, docKind, originalFileName, plaintext);
    }

    private String encryptAndUpload(UUID institutionId, String docKind, String originalFileName, byte[] plaintext) {
        if (!configured) {
            throw new ValidationException("Supabase storage is not configured - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        }
        String safe = originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
        String path = institutionId + "/" + docKind + "/" + UUID.randomUUID() + "_" + safe;
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + documentsBucket + "/" + path;
        try {
            byte[] encrypted = piiCryptoService.encryptBytes(plaintext,
                    credentialFieldCryptoService.institutionDek(institutionId));
            HttpRequest request = HttpRequest.newBuilder(URI.create(uploadUrl))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", "application/octet-stream")
                    .header("x-upsert", "true")
                    .timeout(Duration.ofSeconds(20))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(encrypted))
                    .build();
            HttpResponse<String> response = sendWithRetry(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Supabase document upload failed: HTTP {} - {}", response.statusCode(), response.body());
                throw storageFailure("upload document", response.statusCode());
            }
            // Path, not a public URL - the documents bucket has no public access.
            return path;
        } catch (ValidationException | StorageUnavailableException e) { throw e; }
        catch (Exception ex) {
            log.warn("Supabase document upload exception: {}", ex.getMessage(), ex);
            throw new StorageUnavailableException("Failed to upload document: " + ex.getMessage());
        }
    }

    /**
     * Retries transient Supabase failures for both uploads (idempotent upsert, x-upsert: true)
     * and downloads (GETs).
     *
     * <p>The important case is <b>HTTP 5xx/429</b>. Measured against a real socket: the JDK's
     * HttpClient already retries connection-level failures on its own (5 attempts in ~92ms
     * before surfacing one IOException) but never retries a status code - a 503 comes straight
     * back after a single attempt. So an overloaded Supabase was the one failure mode with no
     * protection at all, while IOException was already being retried twice over.
     *
     * <p>Sleeps between attempts with exponential backoff + jitter. The previous version looped
     * three times with no sleep, which fired all attempts inside a few microseconds - far too
     * fast to outlast any real blip, and redundant with the JDK's own instant retries.
     *
     * <p>4xx other than 429 is returned as-is: a 403/404 will never succeed on retry, and
     * retrying would turn every miss into several round-trips.
     */
    private <T> HttpResponse<T> sendWithRetry(HttpRequest request, HttpResponse.BodyHandler<T> bodyHandler)
            throws java.io.IOException, InterruptedException {
        java.io.IOException lastIo = null;
        HttpResponse<T> lastResponse = null;
        for (int attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            if (attempt > 1) sleepBeforeRetry(attempt);
            try {
                HttpResponse<T> response = HTTP_CLIENT.send(request, bodyHandler);
                if (!isRetryableStatus(response.statusCode())) return response;
                lastResponse = response;
                lastIo = null;
                log.warn("Supabase attempt {}/{} got retryable HTTP {}", attempt, MAX_ATTEMPTS, response.statusCode());
            } catch (java.io.IOException ex) {
                lastIo = ex;
                lastResponse = null;
                log.warn("Supabase attempt {}/{} failed: {}", attempt, MAX_ATTEMPTS, ex.getMessage());
            }
        }
        if (lastResponse != null) return lastResponse; // caller maps the final 5xx/429
        throw lastIo;
    }

    /**
     * 5xx/429 (retries exhausted) is an upstream outage -> 503, so the caller is told to try
     * again rather than that their request was malformed. A 4xx really is about the request
     * (bad path, revoked key) and stays a 400.
     */
    private static RuntimeException storageFailure(String action, int status) {
        String msg = "Failed to " + action + " from storage: HTTP " + status;
        return isRetryableStatus(status) || status >= 500
                ? new StorageUnavailableException(msg)
                : new ValidationException(msg);
    }

    private static boolean isRetryableStatus(int status) {
        return status == 429 || status >= 500;
    }

    /** Exponential backoff with jitter, so concurrent callers don't retry in lockstep. */
    private static void sleepBeforeRetry(int attempt) throws InterruptedException {
        long base = BASE_BACKOFF_MS << (attempt - 2); // attempt 2 -> 200ms, 3 -> 400ms, 4 -> 800ms
        long jitter = java.util.concurrent.ThreadLocalRandom.current().nextLong(base / 2 + 1);
        Thread.sleep(base + jitter);
    }

    @Override
    public byte[] downloadRawFromUrl(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = sendWithRetry(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 300) {
                throw storageFailure("download legacy document", response.statusCode());
            }
            return response.body();
        } catch (ValidationException | StorageUnavailableException e) { throw e; }
        catch (Exception ex) {
            throw new StorageUnavailableException("Failed to download legacy document: " + ex.getMessage());
        }
    }

    @Override
    public byte[] downloadDocument(UUID institutionId, String path) {
        if (!configured) {
            throw new ValidationException("Supabase storage is not configured - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
        }
        String downloadUrl = supabaseUrl + "/storage/v1/object/" + documentsBucket + "/" + path;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(downloadUrl))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = sendWithRetry(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 300) {
                log.warn("Supabase document download failed: HTTP {}", response.statusCode());
                throw storageFailure("download document", response.statusCode());
            }
            return piiCryptoService.decryptBytes(response.body(),
                    credentialFieldCryptoService.institutionDek(institutionId));
        } catch (ValidationException | StorageUnavailableException e) { throw e; }
        catch (Exception ex) {
            log.warn("Supabase document download exception: {}", ex.getMessage(), ex);
            throw new StorageUnavailableException("Failed to download document: " + ex.getMessage());
        }
    }

    @Override
    public boolean isConfigured() {
        return configured;
    }

    @Override
    public String uploadProfileImage(UUID institutionId, MultipartFile file) {
        return uploadImage(institutionId.toString(), file);
    }

    @Override
    public String uploadImage(String pathPrefix, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ValidationException("Profile image file is empty");
        }
        if (file.getSize() > MAX_SIZE) {
            throw new ValidationException("Profile image too large (max 5MB)");
        }
        String contentType = file.getContentType();
        if (contentType != null && !ALLOWED_TYPES.contains(contentType.toLowerCase())) {
            throw new ValidationException("Unsupported image type: " + contentType + " (allowed: jpeg, png, webp, gif)");
        }
        if (!configured) {
            throw new ValidationException("Supabase storage is not configured on the server - set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or provide a profileImageUrl directly");
        }
        try {
            String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "profile";
            String ext = "";
            int dot = original.lastIndexOf('.');
            if (dot >= 0 && dot < original.length() - 1) {
                ext = original.substring(dot).toLowerCase();
                if (!ext.matches("\\.(jpe?g|png|webp|gif)")) {
                    ext = ".jpg";
                }
            } else {
                ext = ".jpg";
            }
            String path = pathPrefix.replaceAll("^/|/$", "") + "/" + UUID.randomUUID() + ext;
            String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + path;

            HttpRequest request = HttpRequest.newBuilder(URI.create(uploadUrl))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", contentType != null ? contentType : "image/jpeg")
                    .header("x-upsert", "true")
                    .timeout(Duration.ofSeconds(20))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();

            HttpResponse<String> response = sendWithRetry(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Supabase upload failed: HTTP {} - {}", response.statusCode(), response.body());
                throw storageFailure("upload profile image", response.statusCode());
            }
            String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + path;
            log.info("Uploaded image at {} to {}", path, publicUrl);
            return publicUrl;
        } catch (ValidationException | StorageUnavailableException e) {
            throw e;
        } catch (Exception ex) {
            log.warn("Supabase upload exception: {}", ex.getMessage(), ex);
            throw new StorageUnavailableException("Failed to upload profile image: " + ex.getMessage());
        }
    }
}
