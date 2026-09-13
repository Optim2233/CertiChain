package com.certichain.certichainbackend.config;

import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.cache.interceptor.CacheErrorHandler;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * A Redis outage must never fail a request.
 *
 * <p>The suite can't reach this via Spring - application-test.properties sets
 * spring.cache.type=none and excludes the Redis autoconfigurations - so the handler is
 * exercised directly.
 *
 * <p>Evict is the one that mattered: Spring's cache interceptor wraps outside the
 * transaction and @CacheEvict defaults to beforeInvocation=false, so the evict runs after
 * commit. SimpleCacheErrorHandler rethrows, which meant issueCertificate() committed the
 * credential and then returned 500 - a failure reported for a write that had succeeded.
 */
class CacheErrorHandlerTest {

    private final CacheErrorHandler handler = new CacheConfig().errorHandler();
    private final RuntimeException redisDown = new RuntimeException("Unable to connect to Redis");

    private Cache cache() {
        Cache cache = mock(Cache.class);
        when(cache.getName()).thenReturn("institution");
        return cache;
    }

    @Test
    void evictFailureDoesNotFailTheCommittedWrite() {
        assertDoesNotThrow(() -> handler.handleCacheEvictError(redisDown, cache(), "key"));
    }

    @Test
    void clearFailureIsSwallowed() {
        assertDoesNotThrow(() -> handler.handleCacheClearError(redisDown, cache()));
    }

    @Test
    void putFailureIsSwallowed() {
        assertDoesNotThrow(() -> handler.handleCachePutError(redisDown, cache(), "key", "value"));
    }

    @Test
    void getFailureIsSwallowedAndEvictsTheBadEntry() {
        Cache cache = cache();

        assertDoesNotThrow(() -> handler.handleCacheGetError(redisDown, cache, "key"));

        // a poisoned entry (e.g. after a serializer change) is dropped so the next read
        // recomputes from Postgres rather than failing again
        verify(cache).evict("key");
    }

    @Test
    void getFailureSurvivesAnEvictThatAlsoFails() {
        Cache cache = cache();
        org.mockito.Mockito.doThrow(redisDown).when(cache).evict("key");

        assertDoesNotThrow(() -> handler.handleCacheGetError(redisDown, cache, "key"));
    }
}
