package com.certichain.certichainbackend.config;

import org.junit.jupiter.api.Test;
import org.springframework.cache.Cache;
import org.springframework.data.redis.connection.RedisStandaloneConfiguration;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertNotNull;

/**
 * The evict fix against a real RedisCacheManager pointed at a port with nothing on it -
 * the same objects the app wires, not mocks. CacheErrorHandlerTest covers the handler in
 * isolation; this proves the exception a dead Redis actually throws is the one it swallows.
 *
 * <p>Port 1 is used deliberately: privileged, never bound, so the connection is refused
 * immediately and the test needs no external service and no cleanup.
 */
class CacheEvictAgainstDeadRedisTest {

    @Test
    void evictFailureFromRealDeadRedisIsSwallowed() {
        var connectionFactory = new LettuceConnectionFactory(new RedisStandaloneConfiguration("127.0.0.1", 1));
        connectionFactory.afterPropertiesSet();
        try {
            Cache cache = new CacheConfig().cacheManager(connectionFactory).getCache("institution");
            assertNotNull(cache);

            // Sanity: the raw call really does blow up, so the assertion below isn't vacuous.
            RuntimeException raw = null;
            for (Runnable op : new Runnable[] {
                    () -> cache.evict("key"),
                    () -> cache.put("key", "value"),
                    () -> cache.get("key"),
                    cache::clear }) {
                try { op.run(); } catch (RuntimeException ex) { raw = ex; break; }
            }
            assertNotNull(raw, "expected a dead Redis to throw on some cache operation");

            // The fix: that same exception must not escape the handler, because by the time
            // an evict runs the transaction has already committed.
            var handler = new CacheConfig().errorHandler();
            RuntimeException fromRedis = raw;
            assertDoesNotThrow(() -> handler.handleCacheEvictError(fromRedis, cache, "key"));
            assertDoesNotThrow(() -> handler.handleCacheClearError(fromRedis, cache));
        } finally {
            connectionFactory.destroy();
        }
    }
}
