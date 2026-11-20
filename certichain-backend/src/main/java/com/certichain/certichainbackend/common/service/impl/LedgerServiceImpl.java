package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.LedgerAnchor;
import com.certichain.certichainbackend.common.entity.LedgerEntry;
import com.certichain.certichainbackend.common.enums.LedgerEventType;
import com.certichain.certichainbackend.common.repository.LedgerAnchorRepository;
import com.certichain.certichainbackend.common.repository.LedgerEntryRepository;
import com.certichain.certichainbackend.common.service.LedgerService;
import com.certichain.certichainbackend.common.service.SigningService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class LedgerServiceImpl implements LedgerService {

    /** Genesis: the previousHash of a chain that has not started yet (64 zero hex chars). */
    public static final String GENESIS = "0".repeat(64);

    private static final long LEDGER_LOCK_KEY = 42L;

    private final LedgerEntryRepository ledgerEntryRepository;
    private final LedgerAnchorRepository ledgerAnchorRepository;
    private final SigningService signingService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    @Transactional
    public void append(LedgerEventType type, UUID credentialId, UUID institutionId, String merkleRoot) {
        // Serialize appends: the advisory xact lock, the head read, the insert and the
        // commit are one transaction, so two concurrent issuances can never build two
        // entries on the same head (a fork). Taken via raw JDBC because the lock
        // function returns void - Hibernate's native-query result mapping chokes on
        // that (PGobject cast), JdbcTemplate just gets a null back.
        jdbcTemplate.queryForObject(
                "SELECT pg_advisory_xact_lock(?)", Object.class, LEDGER_LOCK_KEY);
        String previous = ledgerEntryRepository.findTopByOrderByIdDesc()
                .map(LedgerEntry::getHash)
                .orElse(GENESIS);

        // Millis precision: the hashed timestamp must round-trip through Postgres
        // TIMESTAMPTZ byte-exact, or validateChain() could never recompute it.
        Instant now = Instant.now().truncatedTo(ChronoUnit.MILLIS);
        // PII-free by construction: identifiers and the content root only. The event
        // type lives inside the hashed material so editing the event_type column is
        // detectable too. Values are UUID/hex-enum, so no JSON escaping is needed.
        String payload = "{\"event\":\"" + type.name() + "\",\"credentialId\":\"" + credentialId
                + "\",\"merkleRoot\":\"" + merkleRoot + "\"}";
        String hash = sha256(previous + "|" + payload + "|" + now);

        ledgerEntryRepository.save(LedgerEntry.builder()
                .previousHash(previous)
                .hash(hash)
                .eventType(type.name())
                .credentialId(credentialId)
                .institutionId(institutionId)
                .payload(payload)
                .signature(signingService.sign(hash, institutionId))
                .createdAt(now)
                .build());
    }

    @Override
    @Transactional(readOnly = true)
    public ChainValidation validateChain() {
        List<LedgerEntry> entries = ledgerEntryRepository.findAllByOrderByIdAsc();
        String previous = GENESIS;
        String head = GENESIS;
        for (LedgerEntry entry : entries) {
            String expected = sha256(entry.getPreviousHash() + "|" + entry.getPayload()
                    + "|" + entry.getCreatedAt());
            if (!entry.getHash().equals(expected)
                    || !entry.getPreviousHash().equals(previous)
                    || !signingService.signatureValid(
                            entry.getInstitutionId(), entry.getHash(), entry.getSignature())) {
                return new ChainValidation(false, entries.size(), entry.getId(), head);
            }
            previous = entry.getHash();
            head = entry.getHash();
        }
        return new ChainValidation(true, entries.size(), null, head);
    }

    @Override
    @Transactional(readOnly = true)
    public AnchorInfo anchorInfoFor(UUID credentialId) {
        LedgerEntry entry = ledgerEntryRepository.findTopByCredentialIdOrderByIdDesc(credentialId)
                .orElse(null);
        if (entry == null) {
            return null; // predates the ledger - the frontend hides the line entirely
        }
        // The entry is provably on-chain when any anchor covered chain position >= its id:
        // anchors store the chain length they covered, and entry ids run sequentially from 1.
        String txUrl = ledgerAnchorRepository
                .findFirstByEntriesGreaterThanEqualOrderByIdDesc(entry.getId())
                .map(a -> SEPOLIA_TX_URL_PREFIX + a.getTxHash())
                .orElse(null);
        return new AnchorInfo(entry.getEventType(), txUrl);
    }

    private static String sha256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}
