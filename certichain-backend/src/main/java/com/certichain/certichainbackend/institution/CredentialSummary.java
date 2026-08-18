package com.certichain.certichainbackend.institution;

// Counts backing the institution dashboard's summary bar. "unclaimed" mirrors
// CredentialStatus.PENDING_CLAIM - issued to an email that hasn't signed up yet.
public record CredentialSummary(int total, int revoked, int unclaimed) {}
