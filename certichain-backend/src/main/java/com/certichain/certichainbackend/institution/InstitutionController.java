package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.Institution;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/institution")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionService institutionService;

    @PostMapping("/apply")
    public Institution apply(@RequestParam String name,
                              @RequestParam String ministry,
                              @RequestParam String email,
                              @RequestParam String password,
                              @RequestParam("documents") List<MultipartFile> documents) {
        return institutionService.apply(name, ministry, email, password, documents);
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('INSTITUTION')")
    public Institution me() {
        return institutionService.getOwnInstitution();
    }

    @GetMapping("/credentials")
    @PreAuthorize("hasRole('INSTITUTION')")
    public Page<Credential> listCredentials(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return institutionService.listCredentials(page, size);
    }

    @PostMapping("/credentials")
    @PreAuthorize("hasRole('INSTITUTION')")
    public Credential issueCertificate(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> fields = (List<Map<String, String>>) body.get("fields");
        return institutionService.issueCertificate((String) body.get("graduate_email"), fields);
    }

    @PostMapping("/credentials/batch")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<Map<String, Object>> issueBatch(@RequestParam("file") MultipartFile spreadsheet) {
        return institutionService.issueBatch(spreadsheet);
    }

    @PostMapping("/activity-records")
    @PreAuthorize("hasRole('INSTITUTION')")
    public Credential issueActivityRecord(@RequestBody Map<String, String> body) {
        return institutionService.issueActivityRecord(
                body.get("graduate_email"), body.get("activity"), body.get("date"));
    }

    @PostMapping("/credentials/{id}/revoke")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void revokeCredential(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        institutionService.revokeCredential(id, body.get("reason"));
    }

    @GetMapping("/disputes")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<?> listDisputes() {
        return institutionService.listDisputes();
    }

    @PostMapping("/disputes/{id}/uphold")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void upholdDispute(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        institutionService.upholdDispute(id, body.get("resolution_note"), body.get("action"));
    }

    @PostMapping("/disputes/{id}/dismiss")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void dismissDispute(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        institutionService.dismissDispute(id, body.get("resolution_note"));
    }
}
