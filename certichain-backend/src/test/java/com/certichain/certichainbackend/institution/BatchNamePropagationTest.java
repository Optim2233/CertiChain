package com.certichain.certichainbackend.institution;

import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Regression guard: issueBatch trimmed the submitted batch name into a local, then called
 * the 5-arg issue(...) overload that hardcoded batchName = null. The name was collected,
 * validated and silently discarded, so every batch persisted batch_name = NULL and the
 * batches table showed "Untitled batch" for all of them.
 *
 * <p>The mistake is invisible at the type level - both overloads compile - so this asserts
 * on the source: the batch issue call must forward the trimmed name. A Mockito test would
 * need the full InstitutionServiceImpl constructor (15 collaborators, real crypto) to make
 * the same point.
 */
class BatchNamePropagationTest {

    private static final Path SOURCE = Path.of(
            "src/main/java/com/certichain/certichainbackend/institution/InstitutionServiceImpl.java");

    @Test
    void issueBatchForwardsTheTrimmedBatchName() throws Exception {
        String src = Files.readString(SOURCE);

        assertTrue(src.contains("issue(email, fields, type, expiresAt, batchId, trimmedBatchName)"),
                "issueBatch must pass trimmedBatchName to issue(...) - dropping it persists "
                        + "batch_name = NULL and every batch renders as \"Untitled batch\"");
    }

    @Test
    void noOverloadSilentlyDiscardsTheBatchName() throws Exception {
        String src = Files.readString(SOURCE);

        assertTrue(!src.contains("return issue(graduateEmail, fields, type, expiresAt, batchId, null)"),
                "the 5-arg issue(...) overload hardcoded batchName = null and was the exact "
                        + "trap this bug fell into - don't reintroduce it");
    }
}
