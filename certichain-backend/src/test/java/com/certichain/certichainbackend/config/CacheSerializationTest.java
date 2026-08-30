package com.certichain.certichainbackend.config;

import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.graduate.CredentialListItem;
import com.certichain.certichainbackend.institution.CredentialSummary;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Pins the reason no {@code @Cacheable} method may return a record. This fails in a uniquely
 * quiet way - only on a cache <em>hit</em>, never on the miss that populates it - so an endpoint
 * passes every test, works once, then 500s in the browser seconds later. It shipped exactly that
 * way: {@code /api/graduate/timeline} threw "LinkedHashMap cannot be cast to CredentialListItem".
 *
 * <p>Cause: a cached value is read back as a bare Object, so it has to carry its own type tag.
 * The serializer's default typing is NON_FINAL, and records are final, so no tag is written.
 * Configuring that away needs a serializer this Spring Data Redis version does not expose, so
 * the services return records uncached instead; each is a single indexed query.
 *
 * <p>If a future upgrade fixes the round trip, these tests fail - that is the signal to put the
 * {@code @Cacheable} annotations back.
 */
class CacheSerializationTest {

    private final GenericJacksonJsonRedisSerializer serializer = CacheConfig.valueSerializer();

    private static CredentialListItem sample() {
        return new CredentialListItem(
                UUID.randomUUID(), CredentialType.CERTIFICATE, "BSc Computer Science",
                "Yangon University", "grad@example.com", CredentialStatus.ISSUED,
                null, "merkle", "sig", Instant.parse("2026-08-26T12:00:00Z"), null);
    }

    @Test
    void aBareRecordDoesNotSurviveTheRoundTrip() {
        var original = new CredentialSummary(7, 1, 2);

        Object restored = serializer.deserialize(serializer.serialize(original));

        assertThat(restored).isNotEqualTo(original).isInstanceOf(java.util.Map.class);
    }

    @Test
    void aRecordInsideAListDoesNotSurviveTheRoundTrip() {
        Object restored = serializer.deserialize(serializer.serialize(List.of(sample())));

        // This cast is what threw in production, on the timeline endpoint.
        assertThat((List<?>) restored).first().isNotInstanceOf(CredentialListItem.class);
    }
}
