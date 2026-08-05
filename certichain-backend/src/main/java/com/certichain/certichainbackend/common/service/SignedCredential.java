package com.certichain.certichainbackend.common.service;

import java.util.List;

public record SignedCredential(
        String merkleRoot,
        String signature,
        List<FieldWithIndex> fields
) {
    public record FieldWithIndex(String name, String value, int merkleIndex) {}
}
