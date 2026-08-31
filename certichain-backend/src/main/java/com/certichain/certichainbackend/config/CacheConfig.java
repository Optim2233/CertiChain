package com.certichain.certichainbackend.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;

import java.time.Duration;

/**
 * Every cache gets a 5-minute TTL by default. Each feature service owns one cache
 * (verifier/institution/graduate/accreditation) and evicts it wholesale on writes -
 * see @CacheEvict(allEntries = true) on the mutation methods in those services.
 */
@Configuration
@EnableCaching
public class CacheConfig {

    static GenericJacksonJsonRedisSerializer valueSerializer() {
        // Spring Data Redis 4.x builder() defaults to NO default typing: without it,
        // every cached value round-trips through Redis as a LinkedHashMap and the
        // @Cacheable proxy blows up casting it back to the entity type. Re-enable
        // typing (writes an @class hint) so entities deserialize correctly.
        return GenericJacksonJsonRedisSerializer.builder()
                .enableDefaultTyping(BasicPolymorphicTypeValidator.builder()
                        .allowIfBaseType(Object.class)
                        .allowIfSubType((ctx, clazz) -> true)
                        .build())
                .enableSpringCacheNullValueSupport()
                .build();
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
                .build();
    }
}
