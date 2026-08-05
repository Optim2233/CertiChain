package com.certichain.certichainbackend.common.exception;

import org.springframework.http.HttpStatus;

public class ForbiddenActionException extends ApiException {
    public ForbiddenActionException(String message) {
        super(HttpStatus.FORBIDDEN, "FORBIDDEN_ACTION", message);
    }
}
