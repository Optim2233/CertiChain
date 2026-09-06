package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.repository.CredentialFieldRepository;
import com.certichain.certichainbackend.common.service.DisclosureProof;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** generateProof -> verifyDisclosure round-trip for a selective disclosure over a real tree. */
class MerkleProofRoundTripTest {

    private final CredentialFieldRepository fieldRepository = mock(CredentialFieldRepository.class);
    private final MerkleServiceImpl merkleService = new MerkleServiceImpl(fieldRepository);

    private List<CredentialField> fieldsFor(UUID credentialId, String... nameValuePairs) {
        return IntStream.range(0, nameValuePairs.length / 2)
                .mapToObj(i -> CredentialField.builder()
                        .id(UUID.randomUUID())
                        .credentialId(credentialId)
                        .fieldName(nameValuePairs[i * 2])
                        .fieldValue(nameValuePairs[i * 2 + 1])
                        .merkleIndex(i)
                        .build())
                .toList();
    }

    @Test
    void proofForOneOfFourFieldsVerifiesAgainstTheRoot() {
        UUID credId = UUID.randomUUID();
        List<CredentialField> all = fieldsFor(credId,
                "degree", "BSc Computer Science",
                "gpa", "3.9",
                "graduation_date", "2026-06-01",
                "honors", "Cum Laude");
        when(fieldRepository.findByCredentialIdOrderByMerkleIndex(credId)).thenReturn(all);

        UUID gpaFieldId = all.get(1).getId();
        DisclosureProof proof = merkleService.generateProof(credId, List.of(gpaFieldId));

        assertTrue(merkleService.verifyDisclosure(proof.merkleRoot(), proof));

        // Tamper the disclosed value -> proof no longer reconstructs the root.
        DisclosureProof tampered = new DisclosureProof(proof.merkleRoot(),
                List.of(new DisclosureProof.DisclosedField("gpa", "4.0", 1)),
                proof.proofPath());
        assertFalse(merkleService.verifyDisclosure(proof.merkleRoot(), tampered));
    }

    @Test
    void proofForOddIndexedLeafInAThreeLeafTreeVerifies() {
        UUID credId = UUID.randomUUID();
        List<CredentialField> all = fieldsFor(credId,
                "a", "1", "b", "2", "c", "3");
        when(fieldRepository.findByCredentialIdOrderByMerkleIndex(credId)).thenReturn(all);

        DisclosureProof proof = merkleService.generateProof(credId, List.of(all.get(2).getId()));
        assertTrue(merkleService.verifyDisclosure(proof.merkleRoot(), proof));
    }
}
