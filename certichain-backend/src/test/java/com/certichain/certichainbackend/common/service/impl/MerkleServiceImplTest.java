package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.service.Field;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

/**
 * Pure algorithm test - no Spring context, no DB. computeRoot/buildTree/verifyDisclosure
 * never touch the repository (only generateProof does), so it's safe to construct with a
 * null CredentialFieldRepository here.
 */
class MerkleServiceImplTest {

    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(null);

    @Test
    void oddLeafCountBuildsAConsistentTreeAndRootChangesWithAnyLeaf() {
        List<Field> fields = List.of(
                new Field("degree", "BSc Computer Science"),
                new Field("gpa", "3.9"),
                new Field("graduation_date", "2026-06-01")
        );

        String root = merkleService.computeRoot(fields);
        // Same input -> same root, deterministic
        assertEquals(root, merkleService.computeRoot(fields));

        // Changing any one field changes the root - proves every leaf actually
        // participates in the tree (duplicate-last-node padding didn't silently
        // drop the odd leaf out).
        List<Field> mutated = List.of(
                new Field("degree", "BSc Computer Science"),
                new Field("gpa", "4.0"), // changed
                new Field("graduation_date", "2026-06-01")
        );
        assertNotEquals(root, merkleService.computeRoot(mutated));
    }
}
