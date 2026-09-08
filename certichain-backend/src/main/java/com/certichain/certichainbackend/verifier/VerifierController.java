package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.institution.InstitutionResponse;
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

    // Debug only — not used by verifier portal (which verifies share tokens only)
    @GetMapping("/certificate/{id}")
    public VerificationResponse verifyCertificate(@PathVariable UUID id) {
        return verifierService.verifyById(id);
    }

    // Debug only — kept for file-based cert verification but hidden from verifier UI
    @PostMapping("/file")
    public VerificationResponse verifyFile(@RequestParam("file") MultipartFile file) {
        return verifierService.verifyByFile(file);
    }

    @PostMapping("/bulk")
    public List<BulkVerifyRow> verifyBulk(@RequestParam("file") MultipartFile file) {
        return verifierService.verifyBulk(file);
    }

    @GetMapping("/share/{token}")
    public Object verifyShare(@PathVariable String token) {
        Object result = verifierService.verifyByShareToken(token);
        if (result instanceof List<?> list) {
            @SuppressWarnings("unchecked")
            List<VerificationResponse> typed = (List<VerificationResponse>) list;
            return new ShareVerificationResponse("FULL_TIMELINE", typed);
        }
        return result;
    }

    @GetMapping("/institutions")
    public List<InstitutionResponse> institutions() {
        return verifierService.publicInstitutionDirectory().stream()
                .map(com.certichain.certichainbackend.institution.InstitutionResponse::from).toList();
    }

    @GetMapping("/stats")
    public TrustStats stats() {
        return verifierService.getTrustStats();
    }
}
