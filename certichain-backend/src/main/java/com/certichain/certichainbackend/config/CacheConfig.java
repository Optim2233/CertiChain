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

    @Override
    @Bean
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException ex, org.springframework.cache.Cache cache, Object key) {
                // stale/broken Redis entry (e.g. after serializer validator change) -> evict and miss
                try { cache.evict(key); } catch (Exception ignore) {}
                // swallow so caller recomputes from DB instead of 500
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
