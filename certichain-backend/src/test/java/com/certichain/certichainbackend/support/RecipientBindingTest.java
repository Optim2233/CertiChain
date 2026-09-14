package com.certichain.certichainbackend.support;

import com.certichain.certichainbackend.common.service.Field;
import com.certichain.certichainbackend.institution.InstitutionServiceImpl;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * The recipient binding is what stops a cohort collapsing into one credential, and what
 * makes the signature cover WHO a credential was issued to. These pin the convention that
 * issuance, the edit path and the one-time backfill all share - if they ever disagree,
 * backfilled roots stop matching newly issued ones and every old credential fails
 * verification.
 */
class RecipientBindingTest {

    private static final List<Field> ACADEMIC = List.of(
            new Field("title", "Bachelor of Software Engineering"),
            new Field("graduationDate", "2026-06-01"));

    @Test
    void appendsTheGraduateEmailAsASignedField() {
        List<Field> out = InstitutionServiceImpl.withGraduateEmailField(ACADEMIC, "ava@example.edu");

        assertEquals(3, out.size(), "the email must join the signed field set");
        Field added = out.get(out.size() - 1);
        assertEquals(InstitutionServiceImpl.GRADUATE_EMAIL_FIELD, added.name());
        assertEquals("ava@example.edu", added.value());
    }

    @Test
    void isIdempotentSoResigningNeverDuplicatesTheField() {
        // The edit path and the backfill both re-sign already-bound field sets.
        List<Field> once = InstitutionServiceImpl.withGraduateEmailField(ACADEMIC, "ava@example.edu");
        List<Field> twice = InstitutionServiceImpl.withGraduateEmailField(once, "ava@example.edu");

        assertSame(once, twice, "an already-bound set must be returned untouched");
        assertEquals(1, twice.stream()
                .filter(f -> InstitutionServiceImpl.GRADUATE_EMAIL_FIELD.equals(f.name())).count());
    }

    @Test
    void twoGraduatesWithIdenticalDegreesGetDifferentFieldSets() {
        // This is the whole point: before the binding these were byte-identical, so they
        // hashed to the same merkle root and the dedup index rejected the second one.
        List<Field> ava = InstitutionServiceImpl.withGraduateEmailField(ACADEMIC, "ava@example.edu");
        List<Field> ben = InstitutionServiceImpl.withGraduateEmailField(ACADEMIC, "ben@example.edu");

        assertFalse(ava.equals(ben),
                "identical degrees issued to different graduates must not produce identical "
                        + "field sets - that collapsed a whole cohort into one credential");
    }

    @Test
    void doesNotMutateTheCallersList() {
        List<Field> original = List.of(new Field("title", "BSc"));
        InstitutionServiceImpl.withGraduateEmailField(original, "ava@example.edu");
        assertEquals(1, original.size(), "the caller's field list must not be mutated");
    }

    @Test
    void backfillUpdatesFieldRowsInPlaceRatherThanDeletingThem() throws Exception {
        // share_field_selection holds an FK to credential_field.id. Delete-and-recreate
        // therefore fails with "violates foreign key constraint
        // share_field_selection_credential_field_id_fkey" on any credential a graduate has
        // shared, and - worse - would discard their disclosure choices if the FK ever went
        // away. Updating in place keeps the ids, so existing shares survive the re-sign.
        String src = Files.readString(Path.of(
                "src/main/java/com/certichain/certichainbackend/support/RecipientBindingBackfill.java"));

        assertFalse(src.contains("deleteByCredentialId"),
                "the backfill must not delete credential_field rows - shares reference them by id");
    }

    @Test
    void matchesAnExistingBindingCaseInsensitively() {
        // A legacy row could carry "Graduate_Email"; appending a second one would produce
        // two recipient fields and a root that no longer round-trips.
        List<Field> bound = List.of(new Field("title", "BSc"), new Field("Graduate_Email", "ava@example.edu"));
        assertTrue(InstitutionServiceImpl.withGraduateEmailField(bound, "ava@example.edu") == bound);
    }
}
