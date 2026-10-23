package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.InstitutionDocumentRepository;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.AuditEvents;
import com.certichain.certichainbackend.common.service.AuditLogService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Document access-control + listing-filter paths not covered by AccreditationServiceImplTest. */
class AccreditationDocumentsAndListingTest {

    private final InstitutionRepository institutionRepository = mock(InstitutionRepository.class);
    private final AuditLogService auditLogService = mock(AuditLogService.class);
    private final InstitutionDocumentRepository documentRepository = mock(InstitutionDocumentRepository.class);
    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final com.certichain.certichainbackend.common.service.impl.PiiCryptoService pii =
            com.certichain.certichainbackend.support.TestCrypto.pii();

    private final AccreditationServiceImpl service = new AccreditationServiceImpl(
            institutionRepository, null, auditLogService, null, null,
            documentRepository, null, currentUser, null, pii, null);

    @Test
    void listInstitutionsRejectsUnknownStatus() {
        assertThrows(ValidationException.class,
                () -> service.listInstitutions("NONSENSE", null, 0, 20));
    }

    @Test
    void getDocumentRejectsDocumentFromAnotherInstitution() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(InstitutionDocument.builder()
                .id(docId).institutionId(UUID.randomUUID()).fileName("x.pdf")
                .fileData(new byte[]{1}).uploadedAt(Instant.now()).build()));

        // Cross-institution access is reported as 404, not 403 - don't confirm the doc exists.
        assertThrows(ResourceNotFoundException.class,
                () -> service.getDocument(UUID.randomUUID(), docId));
    }

    @Test
    void getDocumentMissingIs404() {
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class,
                () -> service.getDocument(UUID.randomUUID(), docId));
    }

    @Test
    void verifyDocumentRejectsAlreadyVerified() {
        UUID instId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(InstitutionDocument.builder()
                .id(docId).institutionId(instId).fileName("x.pdf").fileData(new byte[]{1})
                .verified(true).uploadedAt(Instant.now()).build()));

        assertThrows(ValidationException.class, () -> service.verifyDocument(instId, docId));
        verify(auditLogService, never()).log(any(), any(), any(), any());
    }

    @Test
    void verifyDocumentMarksVerifiedAndAudits() {        UUID instId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        UUID actor = UUID.randomUUID();
        when(currentUser.id()).thenReturn(actor);
        InstitutionDocument doc = InstitutionDocument.builder()
                .id(docId).institutionId(instId).fileName("x.pdf").fileData(new byte[]{1})
                .verified(false).uploadedAt(Instant.now()).build();
        when(documentRepository.findById(docId)).thenReturn(Optional.of(doc));

        service.verifyDocument(instId, docId);

        assertEquals(true, doc.isVerified());
        verify(auditLogService).log(eq(AuditEvents.DOCUMENT_VERIFIED_EVENT), eq(actor), eq(instId), isNull());
    }

    @Test
    void getDocumentDecryptsInlineBytes() {
        UUID instId = UUID.randomUUID();
        UUID docId = UUID.randomUUID();
        byte[] pdf = "%PDF-1.4 seeded".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        byte[] enc = pii.encryptBytes(pdf, instId);
        when(documentRepository.findById(docId)).thenReturn(Optional.of(InstitutionDocument.builder()
                .id(docId).institutionId(instId).fileName("license.pdf")
                .fileData(enc)
                .uploadedAt(Instant.now()).build()));

        InstitutionDocument got = service.getDocument(instId, docId);

        org.junit.jupiter.api.Assertions.assertArrayEquals(pdf, got.getFileData());
    }
}
