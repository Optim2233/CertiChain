package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.entity.Institution;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/verify")
@RequiredArgsConstructor
public class VerifierController {

    private final VerifierService verifierService;

    @GetMapping("/certificate/{id}")
    public VerificationResponse verifyCertificate(@PathVariable UUID id) {
        return verifierService.verifyById(id);
    }

    @PostMapping("/file")
    public VerificationResponse verifyFile(@RequestParam("file") MultipartFile file) {
        return verifierService.verifyByFile(file);
    }

    @GetMapping("/share/{token}")
    public Object verifyShare(@PathVariable String token) {
        return verifierService.verifyByShareToken(token);
    }

    @GetMapping("/institutions")
    public List<Institution> institutions() {
        return verifierService.publicInstitutionDirectory();
    }
}
