package com.certichain.certichainbackend.common.service.impl;

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
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Supabase document upload failed: HTTP {} - {}", response.statusCode(), response.body());
                throw new ValidationException("Failed to upload document to storage: HTTP " + response.statusCode());
            }
            // Path, not a public URL - the documents bucket has no public access.
            return path;
        } catch (ValidationException ve) { throw ve; }
        catch (Exception ex) {
            log.warn("Supabase document upload exception: {}", ex.getMessage(), ex);
            throw new ValidationException("Failed to upload document: " + ex.getMessage());
        }
    }

    @Override
    public byte[] downloadRawFromUrl(String url) {
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                    .timeout(Duration.ofSeconds(20))
                    .GET()
                    .build();
            HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 300) {
                throw new ValidationException("Failed to download legacy document: HTTP " + response.statusCode());
            }
            return response.body();
        } catch (ValidationException ve) { throw ve; }
        catch (Exception ex) {
            throw new ValidationException("Failed to download legacy document: " + ex.getMessage());
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
            HttpResponse<byte[]> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() >= 300) {
                log.warn("Supabase document download failed: HTTP {}", response.statusCode());
                throw new ValidationException("Failed to download document from storage: HTTP " + response.statusCode());
            }
            return piiCryptoService.decryptBytes(response.body(),
                    credentialFieldCryptoService.institutionDek(institutionId));
        } catch (ValidationException ve) { throw ve; }
        catch (Exception ex) {
            log.warn("Supabase document download exception: {}", ex.getMessage(), ex);
            throw new ValidationException("Failed to download document: " + ex.getMessage());
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

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Supabase upload failed: HTTP {} - {}", response.statusCode(), response.body());
                throw new ValidationException("Failed to upload profile image to storage: HTTP " + response.statusCode());
            }
            String publicUrl = supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + path;
            log.info("Uploaded image at {} to {}", path, publicUrl);
            return publicUrl;
        } catch (ValidationException ve) {
            throw ve;
        } catch (Exception ex) {
            log.warn("Supabase upload exception: {}", ex.getMessage(), ex);
            throw new ValidationException("Failed to upload profile image: " + ex.getMessage());
        }
    }
}
