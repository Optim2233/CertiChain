package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.repository.InstitutionRepository;
import com.certichain.certichainbackend.common.service.SupabaseStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.UUID;

/**
 * One-time backfill for institution registration documents (establishment doc, DICA
 * certificate, tax clearance, MIC permit) uploaded before the Supabase documents flow
 * was encrypted. Those rows hold a full public URL into the old (public) bucket; this
 * downloads each plaintext file, encrypts it under the owning institution's DEK, uploads
 * it to the new private {@code institution-documents} bucket, and rewrites the column to
 * the new storage path.
 *
 * <p>Gated off by default; run once per environment with
 * {@code BACKFILL_LEGACY_DOCUMENTS=true}, then leave it off. Safe to re-run: a column
 * already holding a bare path (no "http") is treated as already migrated and skipped.
 * Old bucket objects are left in place - deleting them is a manual follow-up once every
 * downstream link off the old URLs has been swapped over.
 */
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.backfill.legacy-documents", havingValue = "true")
public class LegacyDocumentBackfill implements CommandLineRunner {

    private final InstitutionRepository institutionRepository;
    private final SupabaseStorageService supabaseStorageService;

    @Override
    public void run(String... args) {
        List<Institution> institutions = institutionRepository.findAll();
        int migrated = 0, skipped = 0, errors = 0;
        for (Institution institution : institutions) {
            int[] result = migrateInstitution(institution);
            migrated += result[0];
            skipped += result[1];
            errors += result[2];
        }
        System.out.println("[doc-backfill] done - files migrated: " + migrated
                + ", already-migrated/empty skipped: " + skipped + ", errors: " + errors);
    }

    private int[] migrateInstitution(Institution institution) {
        int migrated = 0, skipped = 0, errors = 0;
        boolean changed = false;
        try {
            if (isLegacyUrl(institution.getEstablishmentDocUrl())) {
                institution.setEstablishmentDocUrl(migrateOne(institution.getId(), "establishment", institution.getEstablishmentDocUrl()));
                changed = true; migrated++;
            } else if (institution.getEstablishmentDocUrl() != null) skipped++;

            if (isLegacyUrl(institution.getDicaCertificateUrl())) {
                institution.setDicaCertificateUrl(migrateOne(institution.getId(), "dica", institution.getDicaCertificateUrl()));
                changed = true; migrated++;
            } else if (institution.getDicaCertificateUrl() != null) skipped++;

            if (isLegacyUrl(institution.getTaxClearanceUrl())) {
                institution.setTaxClearanceUrl(migrateOne(institution.getId(), "tax", institution.getTaxClearanceUrl()));
                changed = true; migrated++;
            } else if (institution.getTaxClearanceUrl() != null) skipped++;

            if (isLegacyUrl(institution.getMicPermitUrl())) {
                institution.setMicPermitUrl(migrateOne(institution.getId(), "mic", institution.getMicPermitUrl()));
                changed = true; migrated++;
            } else if (institution.getMicPermitUrl() != null) skipped++;

            if (changed) institutionRepository.save(institution);
        } catch (RuntimeException e) {
            errors++;
            System.err.println("[doc-backfill] FAILED for institution " + institution.getId() + ": " + e.getMessage());
        }
        return new int[]{migrated, skipped, errors};
    }

    /** A bare storage path (already migrated, or never set) has no scheme - only a legacy row is a full URL. */
    private static boolean isLegacyUrl(String value) {
        return value != null && (value.startsWith("http://") || value.startsWith("https://"));
    }

    private String migrateOne(UUID institutionId, String docKind, String legacyUrl) {
        byte[] plaintext = supabaseStorageService.downloadRawFromUrl(legacyUrl);
        String fileName = legacyUrl.substring(legacyUrl.lastIndexOf('/') + 1);
        return supabaseStorageService.migrateDocument(institutionId, docKind, fileName, plaintext);
    }
}
