package com.certichain.certichainbackend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import java.time.Duration;

/**
 * Every cache gets a 5-minute TTL by default. Each feature service owns one cache
 * (verifier/institution/graduate/accreditation) and evicts it wholesale on writes -
 * see @CacheEvict(allEntries = true) on the mutation methods in those services.
 */
@Configuration
@EnableCaching
@EnableAsync // email dispatch only (@Async on EmailServiceImpl) - keeps SMTP round-trips off request threads
public class CacheConfig implements CachingConfigurer {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(CacheConfig.class);

    static GenericJacksonJsonRedisSerializer valueSerializer() {
        return GenericJacksonJsonRedisSerializer.builder()
                .enableDefaultTyping(BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .allowIfSubType((ctx, clazz) -> {
                            String n = clazz.getName();
                            return n.startsWith("com.certichain.certichainbackend.")
                                    || n.startsWith("java.util.")
                                    || n.startsWith("java.time.")
                                    || n.equals("java.util.ArrayList")
                                    || n.equals("java.util.LinkedHashMap");
                        })
                        .build())
                .enableSpringCacheNullValueSupport()
                .build();
    }

    /**
     * The cache must never fail a request. All four operations log and swallow.
     *
     * <p>Evict is the critical one: the cache interceptor wraps <i>outside</i> the transaction
     * and @CacheEvict defaults to beforeInvocation=false, so the evict runs after commit. With
     * Redis down, SimpleCacheErrorHandler's rethrow meant issueCertificate() saved the
     * credential and then returned 500 - the institution saw a failure for a write that had
     * actually succeeded, and re-issued a duplicate. 34 @CacheEvict sites shared that shape.
     *
     * <p>Tradeoff: if Redis serves reads but fails evicts, entries can be stale until their TTL
     * expires (5 min default, 60s for currentUser). Bounded, and far better than 500ing a
     * committed write.
     */
    @Override
    @Bean
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException ex, org.springframework.cache.Cache cache, Object key) {
                // stale/broken Redis entry (e.g. after serializer validator change) -> evict and miss
                log.warn("Cache get failed on '{}' - serving from source: {}", cache.getName(), ex.getMessage());
                try { cache.evict(key); } catch (Exception ignore) {}
                // swallow so caller recomputes from DB instead of 500
            }

            @Override
            public void handleCachePutError(RuntimeException ex, org.springframework.cache.Cache cache, Object key, Object value) {
                // the value simply isn't cached; the caller already has it
                log.warn("Cache put failed on '{}' - value not cached: {}", cache.getName(), ex.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException ex, org.springframework.cache.Cache cache, Object key) {
                // the write already committed - never fail it over a cache miss-to-be
                log.warn("Cache evict failed on '{}' - entries may be stale until TTL: {}", cache.getName(), ex.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException ex, org.springframework.cache.Cache cache) {
                log.warn("Cache clear failed on '{}' - entries may be stale until TTL: {}", cache.getName(), ex.getMessage());
            }
        };
    }

    @Bean
    RedisCacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        var serializer = valueSerializer();
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(5))
                .disableCachingNullValues()
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(serializer));

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                // Caller identity goes stale fast on purpose: role revocation and
                // profile edits must propagate within a minute, not five.
                .withCacheConfiguration("currentUser",
                        defaultConfig.entryTtl(Duration.ofSeconds(60)))
                .build();
    }
}
