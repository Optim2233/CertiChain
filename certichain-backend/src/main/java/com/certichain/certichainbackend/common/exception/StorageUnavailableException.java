package com.certichain.certichainbackend.common.exception;

import org.springframework.http.HttpStatus;

/**
 * Object storage (Supabase) is unreachable or failing upstream - not the caller's fault.
 * Distinct from ValidationException (400), which would tell the caller their request was
 * malformed and that retrying is pointless. 503 says the opposite: nothing is wrong with
 * the request, try again.
 */
public class StorageUnavailableException extends ApiException {
    public StorageUnavailableException(String message) {
        super(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", message);
    }
}
