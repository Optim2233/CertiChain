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
    private final boolean configured;

    public SupabaseStorageServiceImpl(
            @Value("${supabase.url:}") String supabaseUrl,
            @Value("${supabase.service-role-key:}") String serviceRoleKey,
            @Value("${supabase.bucket:institution-profiles}") String bucket) {
        this.supabaseUrl = supabaseUrl != null ? supabaseUrl.trim().replaceAll("/$", "") : "";
        this.serviceRoleKey = serviceRoleKey != null ? serviceRoleKey.trim() : "";
        this.bucket = bucket != null && !bucket.isBlank() ? bucket.trim() : "institution-profiles";
        this.configured = !this.supabaseUrl.isBlank() && !this.serviceRoleKey.isBlank();
        if (!configured) {
            log.warn("Supabase storage not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing) - profile image uploads will require a direct URL or will fail if a file is sent");
        } else {
            log.info("Supabase storage configured: url={} bucket={}", this.supabaseUrl, this.bucket);
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
        // reuse image upload path but with documents/ prefix and pdf handling
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : docKind + ".pdf";
        String safe = original.replaceAll("[^a-zA-Z0-9._-]", "_");
        String path = "documents/" + institutionId + "/" + docKind + "/" + UUID.randomUUID() + "_" + safe;
        String uploadUrl = supabaseUrl + "/storage/v1/object/" + bucket + "/" + path;
        try {
            HttpRequest request = HttpRequest.newBuilder(URI.create(uploadUrl))
                    .header("apikey", serviceRoleKey)
                    .header("Authorization", "Bearer " + serviceRoleKey)
                    .header("Content-Type", ct != null ? ct : "application/pdf")
                    .header("x-upsert", "true")
                    .timeout(Duration.ofSeconds(20))
                    .POST(HttpRequest.BodyPublishers.ofByteArray(file.getBytes()))
                    .build();
            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Supabase document upload failed: HTTP {} - {}", response.statusCode(), response.body());
                throw new ValidationException("Failed to upload document to storage: HTTP " + response.statusCode());
            }
            return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + path;
        } catch (ValidationException ve) { throw ve; }
        catch (Exception ex) {
            log.warn("Supabase document upload exception: {}", ex.getMessage(), ex);
            throw new ValidationException("Failed to upload document: " + ex.getMessage());
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
