package com.certichain.certichainbackend.accreditation;

import java.time.Instant;
import java.util.UUID;

// Metadata only - never carries file_data, so the listing endpoint stays light even when
// a document is large. Fetch bytes one at a time via the download endpoint.
public record InstitutionDocumentResponse(
        UUID id,
        String fileName,
        boolean verified,
        Instant uploadedAt
) {}
