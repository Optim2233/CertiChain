package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface AuditLogEntryRepository extends JpaRepository<AuditLogEntry, UUID> {
    Page<AuditLogEntry> findByInstitutionId(UUID institutionId, Pageable pageable);

    int countByEventAndCredentialIdIn(String event, Collection<UUID> credentialIds);

    int countByEventAndCredentialIdInAndOccurredAtAfter(
            String event, Collection<UUID> credentialIds, Instant occurredAt);

    int countByEventAndShareIdInAndOccurredAtAfter(
            String event, Collection<UUID> shareIds, Instant occurredAt);

    int countByEvent(String event);

    List<AuditLogEntry> findByShareIdOrderByOccurredAtDesc(UUID shareId);

    List<AuditLogEntry> findByShareIdAndEventOrderByOccurredAtDesc(UUID shareId, String event);

    /**
     * Daily counts of a given event for one institution since a cutoff, for a trend view.
     * Native + date_trunc is fine here - Postgres is the only target DB for this project.
     */
    @Query(value = """
            SELECT date_trunc('day', occurred_at) AS day, COUNT(*) AS count
            FROM audit_log_entry
            WHERE institution_id = :institutionId AND event = :event AND occurred_at >= :since
            GROUP BY day
            ORDER BY day
            """, nativeQuery = true)
    List<Object[]> dailyCountsByInstitutionAndEvent(
            @Param("institutionId") UUID institutionId, @Param("event") String event, @Param("since") Instant since);

    List<AuditLogEntry> findByEventAndCredentialIdInOrderByOccurredAtDesc(String event, Collection<UUID> credentialIds);

    // Optional-filter combinations spelled out as derived queries (mirrors
    // AccreditationServiceImpl.listInstitutions) rather than a single "(:x IS NULL OR ...)"
    // JPQL query - Hibernate can't always infer a bare bind parameter's type in that shape.
    Page<AuditLogEntry> findByEventContainingIgnoreCase(String q, Pageable pageable);

    Page<AuditLogEntry> findByEvent(String event, Pageable pageable);

    Page<AuditLogEntry> findByInstitutionIdAndEventContainingIgnoreCase(
            UUID institutionId, String q, Pageable pageable);

    Page<AuditLogEntry> findByInstitutionIdAndEvent(UUID institutionId, String event, Pageable pageable);
}
