package com.certichain.certichainbackend.institution;

// Outcome of restoring a batch: how many were restored now vs. already active (not revoked).
public record BatchUnrevokeResult(int restored, int alreadyActive) {}
