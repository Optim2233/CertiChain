package com.certichain.certichainbackend.common.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface SupabaseStorageService {
    String uploadProfileImage(UUID institutionId, MultipartFile file);

    /** Same as {@link #uploadProfileImage} but with a caller-supplied path prefix (e.g. "users/&lt;id&gt;"). */
    String uploadImage(String pathPrefix, MultipartFile file);

    String uploadDocument(UUID institutionId, String docKind, MultipartFile file);

    boolean isConfigured();
}
