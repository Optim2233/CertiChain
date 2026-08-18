package com.certichain.certichainbackend.verifier;

import com.certichain.certichainbackend.common.enums.VerificationResult;

/** One row of a bulk CSV verify request: the raw input text plus its lookup outcome. */
public record BulkVerifyRow(String input, VerificationResult result, String credentialTitle, String issuedTo) {}
