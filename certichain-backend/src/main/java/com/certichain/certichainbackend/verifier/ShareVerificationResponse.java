package com.certichain.certichainbackend.verifier;

import java.util.List;

public record ShareVerificationResponse(String scope, List<VerificationResponse> results) {}
