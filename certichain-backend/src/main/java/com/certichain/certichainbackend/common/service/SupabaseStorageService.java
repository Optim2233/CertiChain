package com.certichain.certichainbackend.common.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface SupabaseStorageService {
    String uploadProfileImage(UUID institutionId, MultipartFile file);

    /** Same as {@link #uploadProfileImage} but with a caller-supplied path prefix (e.g. "users/&lt;id&gt;"). */
    String uploadImage(String pathPrefix, MultipartFile file);

    /**
     * Encrypts the file under the institution's DEK and uploads it to the private
     * "documents" bucket. Returns the storage path (not a public URL - the bucket has
     * no public access) to store on the institution row; fetch the plaintext back via
     * {@link #downloadDocument}.
     */
    String uploadDocument(UUID institutionId, String docKind, MultipartFile file);

    /** Downloads the object at {@code path} and decrypts it under the institution's DEK. */
    byte[] downloadDocument(UUID institutionId, String path);

    /**
     * Migration-only: fetches raw bytes from an arbitrary (legacy, public) URL - no
     * decryption, since pre-migration documents were never encrypted.
     */
    byte[] downloadRawFromUrl(String url);

    /**
     * Migration-only: encrypts {@code plaintext} under the institution's DEK and uploads
     * it to the private documents bucket at {@code institutionId/docKind/<uuid>_<safeName>}.
     * Returns the storage path.
     */
    String migrateDocument(UUID institutionId, String docKind, String originalFileName, byte[] plaintext);

    boolean isConfigured();
}
