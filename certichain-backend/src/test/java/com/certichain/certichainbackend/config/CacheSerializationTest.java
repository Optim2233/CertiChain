package com.certichain.certichainbackend.config;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.institution.CredentialSummary;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;

import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the Redis cache value serializer's round-trip behaviour.
 *
 * <p>History: on Spring Boot 4.1 / Spring Data Redis 4.x, {@code GenericJacksonJsonRedisSerializer
 * .builder().build()} defaults to <em>no</em> default typing, so every cached value reads back as
 * a {@code LinkedHashMap} and a {@code @Cacheable} method 500s on its first cache <em>hit</em>
 * ("LinkedHashMap cannot be cast to ..."). {@code /api/institution/me} shipped exactly that way.
 *
 * <p>{@link CacheConfig#valueSerializer()} now re-enables default typing (+ Spring cache null
 * support), so a cached single value — entity or record — is self-describing and survives the
 * round trip. These tests lock that in.
 *
 * <p>Note: a raw {@code List<record>} return type still does not round-trip (the list itself
 * carries no type tag). Services that return a bare list of records — e.g. graduate timeline —
 * stay uncached for that reason; don't add {@code @Cacheable} to them.
 */
class CacheSerializationTest {

    private final GenericJacksonJsonRedisSerializer serializer = CacheConfig.valueSerializer();

    @Test
    void aRecordSurvivesTheRoundTrip() {
        var original = new CredentialSummary(7, 1, 2);

        Object restored = serializer.deserialize(serializer.serialize(original));

        assertThat(restored).isEqualTo(original);
    }

    @Test
    void anEntitySurvivesTheRoundTrip() {
        var original = Institution.builder()
                .name("Yangon University")
                .ministry("Education")
                .status(InstitutionStatus.APPROVED)
                .appliedAt(Instant.parse("2026-08-26T12:00:00Z"))
                .brandColor("#0B1E3D")
                .accentPattern("dots")
                .build();

        Object restored = serializer.deserialize(serializer.serialize(original));

        assertThat(restored).isInstanceOf(Institution.class);
        var i = (Institution) restored;
        assertThat(i.getName()).isEqualTo("Yangon University");
        assertThat(i.getBrandColor()).isEqualTo("#0B1E3D");
        assertThat(i.getAccentPattern()).isEqualTo("dots");
    }
}
