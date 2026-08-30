package com.certichain.certichainbackend.common.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

public interface SupabaseStorageService {
    String uploadProfileImage(UUID institutionId, MultipartFile file);
    boolean isConfigured();
}
