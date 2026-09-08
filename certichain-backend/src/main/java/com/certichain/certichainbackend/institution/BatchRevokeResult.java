package com.certichain.certichainbackend.institution;

// Outcome of revoking a batch: how many were revoked now vs. already revoked before.
public record BatchRevokeResult(int revoked, int alreadyRevoked) {}
