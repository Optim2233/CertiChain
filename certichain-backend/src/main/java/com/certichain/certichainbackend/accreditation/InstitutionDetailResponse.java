package com.certichain.certichainbackend.accreditation;

import com.certichain.certichainbackend.common.enums.InstitutionStatus;

import java.time.Instant;
import java.util.UUID;

/**
 * Full institution record for the AA detail page. A record rather than the raw
 * Institution entity because contact email lives on the User row - something has
 * to join the two - and because a record has no privateKeyEnc field to leak.
 * Cache-safe: records survive the Redis JSON round trip (see InstitutionDocumentResponse).
 *
 * <p>Carries the remodeled registration dossier (V18 type/address/establishment/
 * business/people columns) so AA reviewers see everything the institution submitted.
 * Dates are ISO strings (LocalDate has no global Jackson shape here); founders and
 * administrator are raw JSONB strings for the frontend to parse and render.
 */
public record InstitutionDetailResponse(
        UUID id, String name, String ministry, InstitutionStatus status,
        String statusReason, Instant appliedAt, Instant decidedAt,
        String publicKey, String keyAlgorithm, Instant keyGeneratedAt,
        String phone, String website, String profileImageUrl,
        String brandColor, String accentPattern,
        Instant updatedAt, long version,
        String contactEmail, Instant contactSince,
        // remodeled registration dossier (V18)
        String institutionType, String institutionNameMm, String institutionCategory,
        String stateRegion, String district, String township, String ward, String street, String postalCode,
        Integer yearEstablished, String establishmentDocType, String establishmentDocTitle,
        String establishmentDocRef, String establishmentDocIssueDate, String establishmentDocUrl,
        String companyName, String dicaCertificateNumber, String mycoRegistrationNumber,
        String tinNumber, String incorporationDate, String ownershipStructure,
        Long investmentAmount, Boolean foreignInvolvement, String micPermitNumber,
        String dicaCertificateUrl, String taxClearanceUrl, String micPermitUrl,
        String founders, String administrator
) {}
