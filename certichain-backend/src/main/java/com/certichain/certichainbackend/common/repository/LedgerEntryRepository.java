package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.LedgerEntry;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface LedgerEntryRepository extends JpaRepository<LedgerEntry, Long> {

    /** The current chain head (highest id), or empty when the chain has not started. */
    Optional<LedgerEntry> findTopByOrderByIdDesc();

    /** The credential's most recent ledger event, or empty when it predates the ledger. */
    Optional<LedgerEntry> findTopByCredentialIdOrderByIdDesc(UUID credentialId);

    List<LedgerEntry> findAllByOrderByIdAsc();

    // The advisory append lock is taken via JdbcTemplate in LedgerServiceImpl, NOT here:
    // pg_advisory_xact_lock returns void, and a Spring Data native query maps the result
    // through Hibernate, which casts it to the declared type and blows up (PGobject ->
    // ClassCastException on the first issuance). Raw JDBC just gets a null back.
}
