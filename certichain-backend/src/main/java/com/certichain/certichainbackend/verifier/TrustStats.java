package com.certichain.certichainbackend.verifier;

/** Trust-bar stat on the Verifier landing page: accredited institutions and lifetime verification count. */
public record TrustStats(int institutionCount, int verificationCount) {}
