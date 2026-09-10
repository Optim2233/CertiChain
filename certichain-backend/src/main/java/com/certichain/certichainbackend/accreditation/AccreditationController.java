package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/aa")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ACCREDITATION_AUTHORITY')")
public class AccreditationController {

    private final AccreditationService accreditationService;

    @GetMapping("/institutions")
    public Page<Institution> listInstitutions(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return accreditationService.listInstitutions(status, q, page, size);
    }

    @GetMapping("/institutions/{id}")
    public InstitutionDetailResponse getInstitution(@PathVariable UUID id) {
        return accreditationService.getInstitution(id);
    }

    @GetMapping("/institutions/disputed-ids")
    public List<UUID> institutionsWithOpenDisputes() {
        return accreditationService.institutionsWithOpenDisputes();
    }

    @PostMapping("/institutions/{id}/approve")
    public void approve(@PathVariable UUID id) {
        accreditationService.approve(id);
    }

    @PostMapping("/institutions/{id}/request-info")
    public void requestInfo(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        accreditationService.requestInfo(id, body.get("note"));
    }

    @PostMapping("/institutions/{id}/reject")
    public void reject(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        accreditationService.reject(id, body.get("reason"));
    }

    @PostMapping("/institutions/{id}/suspend")
    public void suspend(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        accreditationService.suspend(id, body.get("reason"));
    }

    @PostMapping("/institutions/{id}/reinstate")
    public void reinstate(@PathVariable UUID id) {
        accreditationService.reinstate(id);
    }

    @PostMapping("/institutions/{id}/revoke")
    public void revoke(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        accreditationService.revoke(id, body.get("reason"));
    }

    @GetMapping("/audit-log")
    public Page<AuditLogEntryResponse> auditLog(
            @RequestParam(required = false) UUID institutionId,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) String event,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return accreditationService.auditLog(institutionId, q, event, page, size);
    }

    @GetMapping("/institutions/{id}/documents")
    public List<InstitutionDocumentResponse> listDocuments(@PathVariable UUID id) {
        return accreditationService.listDocuments(id);
    }

    @GetMapping("/institutions/{id}/documents/{documentId}")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        InstitutionDocument document = accreditationService.getDocument(id, documentId);
        // "inline" (not "attachment"): the frontend fetches this both to preview a PDF in an
        // iframe and to force-download via its own <a download> - "attachment" would make the
        // browser save-to-disk it before JS ever gets to render it. Explicit content type is
        // what lets the browser's PDF viewer recognize the blob at all; a raw byte[] body
        // defaults to application/octet-stream, which no viewer renders inline.
        String contentType = document.getFileName().toLowerCase().endsWith(".pdf")
                ? MediaType.APPLICATION_PDF_VALUE
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
        return ResponseEntity.ok()
                .header("Content-Type", contentType)
                .header("Content-Disposition", "inline; filename=\"" + document.getFileName() + "\"")
                .body(document.getFileData());
    }

    @GetMapping("/institutions/{id}/documents/url/{kind}")
    public ResponseEntity<byte[]> downloadUrlDocument(@PathVariable UUID id, @PathVariable String kind) {
        // Same "inline" reasoning as downloadDocument above - the frontend both previews
        // (iframe) and force-downloads (blob + <a download>) this response.
        byte[] data = accreditationService.getUrlDocument(id, kind);
        return ResponseEntity.ok()
                .header("Content-Type", MediaType.APPLICATION_PDF_VALUE)
                .header("Content-Disposition", "inline; filename=\"" + kind + ".pdf\"")
                .body(data);
    }

    @PostMapping("/institutions/{id}/documents/{documentId}/verify")
    public void verifyDocument(@PathVariable UUID id, @PathVariable UUID documentId) {
        accreditationService.verifyDocument(id, documentId);
    }
}
