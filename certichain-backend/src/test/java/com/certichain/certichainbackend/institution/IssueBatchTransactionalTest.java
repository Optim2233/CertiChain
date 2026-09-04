package com.certichain.certichainbackend.institution;

import org.junit.jupiter.api.Test;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * Regression guard: InstitutionServiceImpl is @Transactional(readOnly = true) at class
 * level. issueBatch writes rows, so it MUST override with a read-write @Transactional -
 * without it Hibernate silently skips the flush and every issued credential is discarded
 * on commit (caught in a live smoke test, not by the Mockito unit tests).
 */
class IssueBatchTransactionalTest {

    @Test
    void issueBatchIsAReadWriteTransaction() throws NoSuchMethodException {
        Method m = InstitutionServiceImpl.class.getMethod("issueBatch",
                org.springframework.web.multipart.MultipartFile.class);
        Transactional tx = m.getAnnotation(Transactional.class);

        assertNotNull(tx, "issueBatch must declare its own @Transactional (class default is readOnly)");
        assertFalse(tx.readOnly(), "issueBatch persists rows - its @Transactional must be read-write");
    }
}
