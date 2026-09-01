package com.certichain.certichainbackend.institution;

import com.certichain.certichainbackend.common.entity.CredentialField;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/institution")
@RequiredArgsConstructor
public class InstitutionController {

    private final InstitutionService institutionService;

    @PostMapping("/apply")
    public InstitutionResponse apply(@RequestParam String name,
                               @RequestParam String ministry,
                               @RequestParam String email,
                               @RequestParam String password,
                               @RequestParam(required = false) String phone,
                               @RequestParam(required = false) String website,
                               @RequestParam(value = "documents", required = false) List<MultipartFile> documents) {
        return InstitutionResponse.from(institutionService.apply(name, ministry, email, password, phone, website, documents));
    }

    @GetMapping("/me")
    @PreAuthorize("hasRole('INSTITUTION')")
    public InstitutionResponse me() {
        return InstitutionResponse.from(institutionService.getOwnInstitution());
    }

    @PutMapping(value = "/me", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('INSTITUTION')")
    public InstitutionResponse updateMe(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String website,
            @RequestParam(required = false) String profileImageUrl,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage,
            @RequestParam(required = false) String brandColor,
            @RequestParam(required = false) String accentPattern) {
        return InstitutionResponse.from(institutionService.updateOwnInstitution(
                name, phone, website, profileImageUrl, profileImage, brandColor, accentPattern));
    }

    @PutMapping(value = "/me", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('INSTITUTION')")
    public InstitutionResponse updateMeJson(@RequestBody Map<String, String> body) {
        return InstitutionResponse.from(institutionService.updateOwnInstitution(
                body.get("name"),
                body.get("phone"),
                body.get("website"),
                body.get("profileImageUrl"),
                null,
                body.get("brandColor"),
                body.get("accentPattern")));
    }

    @GetMapping("/credentials")
    @PreAuthorize("hasRole('INSTITUTION')")
    public Page<CredentialResponse> listCredentials(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return institutionService.listCredentials(status, page, size).map(CredentialResponse::from);
    }

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('INSTITUTION')")
    public InstitutionAnalytics getAnalytics() {
        return institutionService.getAnalytics();
    }

    @GetMapping("/credentials/summary")
    @PreAuthorize("hasRole('INSTITUTION')")
    public CredentialSummary getCredentialSummary() {
        return institutionService.getCredentialSummary();
    }

    @PostMapping("/credentials")
    @PreAuthorize("hasRole('INSTITUTION')")
    public CredentialResponse issueCertificate(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> fields = (List<Map<String, String>>) body.get("fields");
        return CredentialResponse.from(institutionService.issueCertificate(
                (String) body.get("graduate_email"), fields, parseExpiresAt((String) body.get("expires_at"))));
    }

    @PostMapping("/credentials/batch")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<Map<String, Object>> issueBatch(@RequestParam("file") MultipartFile spreadsheet) {
        return institutionService.issueBatch(spreadsheet);
    }

    // A static example, not generated from anything - the batch parser accepts arbitrary
    // extra columns as credential fields, so there's no fixed schema to derive this from.
    @GetMapping("/credentials/batch/template")
    @PreAuthorize("hasRole('INSTITUTION')")
    public ResponseEntity<byte[]> batchTemplate() {
        String csv = "graduate_email,type,degree,graduationDate,expires_at\n"
                + "student@example.edu,certificate,BSc Computer Science,2026-06-01,\n";
        return ResponseEntity.ok()
                .header("Content-Disposition", ContentDisposition.attachment().filename("batch-template.csv").build().toString())
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csv.getBytes(StandardCharsets.UTF_8));
    }

    @PostMapping("/activity-records")
    @PreAuthorize("hasRole('INSTITUTION')")
    public CredentialResponse issueActivityRecord(@RequestBody Map<String, String> body) {
        return CredentialResponse.from(institutionService.issueActivityRecord(
                body.get("graduate_email"), body.get("activity"), body.get("date"),
                parseExpiresAt(body.get("expires_at"))));
    }

    /** Optional, date-only (YYYY-MM-DD) from the frontend's date input; blank means never expires. */
    private static Instant parseExpiresAt(String expiresAt) {
        if (expiresAt == null || expiresAt.isBlank()) return null;
        try {
            return LocalDate.parse(expiresAt.trim()).atStartOfDay(ZoneOffset.UTC).toInstant();
        } catch (java.time.format.DateTimeParseException ex) {
            throw new com.certichain.certichainbackend.common.exception.ValidationException(
                    "Invalid expires_at (expected YYYY-MM-DD): " + expiresAt);
        }
    }

    @PostMapping("/credentials/{id}/revoke")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void revokeCredential(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        institutionService.revokeCredential(id, body.get("reason"));
    }

    @GetMapping("/credentials/batches")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<BatchSummaryRow> listBatches() {
        return institutionService.listBatches();
    }

    @PostMapping("/credentials/batches/{batchId}/revoke")
    @PreAuthorize("hasRole('INSTITUTION')")
    public BatchRevokeResult revokeBatch(@PathVariable UUID batchId, @RequestBody Map<String, String> body) {
        return institutionService.revokeBatch(batchId, body.get("reason"));
    }

    @GetMapping("/credentials/{id}/fields")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<CredentialField> getCredentialFields(@PathVariable UUID id) {
        return institutionService.getCredentialFields(id);
    }

    @GetMapping("/credentials/{id}")
    @PreAuthorize("hasRole('INSTITUTION')")
    public CredentialResponse getCredential(@PathVariable UUID id) {
        return CredentialResponse.from(institutionService.getCredential(id));
    }

    @PutMapping("/credentials/{id}")
    @PreAuthorize("hasRole('INSTITUTION')")
    public CredentialResponse editCredential(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> fields = (List<Map<String, String>>) body.get("fields");
        return CredentialResponse.from(institutionService.editCredential(id, fields));
    }

    @GetMapping("/disputes")
    @PreAuthorize("hasRole('INSTITUTION')")
    public List<?> listDisputes() {
        return institutionService.listDisputes();
    }

    @PostMapping("/disputes/{id}/uphold")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void upholdDispute(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Map<String, String>> fields = (List<Map<String, String>>) body.get("fields");
        institutionService.upholdDispute(id, (String) body.get("resolution_note"), (String) body.get("action"), fields);
    }

    @PostMapping("/disputes/{id}/dismiss")
    @PreAuthorize("hasRole('INSTITUTION')")
    public void dismissDispute(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        institutionService.dismissDispute(id, body.get("resolution_note"));
    }
}
