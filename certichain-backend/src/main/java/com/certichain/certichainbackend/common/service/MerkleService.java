package com.certichain.certichainbackend.common.service;

import java.util.List;
import java.util.UUID;

public interface MerkleService {
    DisclosureProof generateProof(UUID credentialId, List<UUID> selectedFieldIds);
    String computeRoot(List<Field> fields); // used by SigningServiceImpl

    /** Recomputes a root from disclosed leaves + a proof path and compares it to expectedRoot. */
    boolean verifyDisclosure(String expectedRoot, DisclosureProof proof);
}
