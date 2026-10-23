package com.certichain.certichainbackend.institution;

// Outcome of restoring a batch: restored now, already active (not revoked), and skipped
// because an identical credential was issued while this one was revoked - restoring
// those would violate the active-duplicate index.
public record BatchUnrevokeResult(int restored, int alreadyActive, int superseded) {}
