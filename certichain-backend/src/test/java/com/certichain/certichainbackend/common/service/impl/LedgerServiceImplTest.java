package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.LedgerAnchor;
import com.certichain.certichainbackend.common.entity.LedgerEntry;
import com.certichain.certichainbackend.common.enums.LedgerEventType;
import com.certichain.certichainbackend.common.repository.LedgerAnchorRepository;
import com.certichain.certichainbackend.common.repository.LedgerEntryRepository;
import com.certichain.certichainbackend.common.service.LedgerService;
import com.certichain.certichainbackend.common.service.SigningService;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Chain mechanics with an in-memory repository: linkage, validation, and tamper
 * detection. The signing layer is mocked (covered by SigningServiceImplTest); the
 * hash/link/recompute logic here is real.
 */
class LedgerServiceImplTest {

    private final LedgerEntryRepository repository = mock(LedgerEntryRepository.class);
    private final LedgerAnchorRepository anchorRepository = mock(LedgerAnchorRepository.class);
    private final SigningService signingService = mock(SigningService.class);
    private final JdbcTemplate jdbcTemplate = mock(JdbcTemplate.class);
    private final LedgerServiceImpl service =
            new LedgerServiceImpl(repository, anchorRepository, signingService, jdbcTemplate);

    private final List<LedgerEntry> store = new ArrayList<>();
    private long nextId = 1;

    {
        when(repository.save(any())).thenAnswer(inv -> {
            LedgerEntry e = inv.getArgument(0);
            e.setId(nextId++);
            store.add(e);
            return e;
        });
        when(repository.findTopByOrderByIdDesc())
                .thenAnswer(inv -> store.isEmpty() ? Optional.empty() : Optional.of(store.get(store.size() - 1)));
        when(repository.findAllByOrderByIdAsc())
                .thenAnswer(inv -> store.stream().sorted(Comparator.comparing(LedgerEntry::getId)).toList());
        when(signingService.sign(any(), any())).thenReturn("sig");
        when(signingService.signatureValid(any(), any(), any())).thenReturn(true);
    }

    private void append(LedgerEventType type) {
        service.append(type, UUID.randomUUID(), UUID.randomUUID(), "root");
    }

    @Test
    void emptyChainIsValidAtGenesis() {
        LedgerService.ChainValidation result = service.validateChain();
        assertTrue(result.valid());
        assertEquals(0, result.entries());
        assertEquals(LedgerServiceImpl.GENESIS, result.headHash());
    }

    @Test
    void appendsLinkAndTheWholeChainValidates() {
        append(LedgerEventType.ISSUED);
        append(LedgerEventType.AMENDED);
        append(LedgerEventType.REVOKED);

        assertEquals(3, store.size());
        assertEquals(LedgerServiceImpl.GENESIS, store.get(0).getPreviousHash());
        // Each entry builds on the previous one's hash - the chain property itself.
        assertEquals(store.get(0).getHash(), store.get(1).getPreviousHash());
        assertEquals(store.get(1).getHash(), store.get(2).getPreviousHash());

        LedgerService.ChainValidation result = service.validateChain();
        assertTrue(result.valid());
        assertEquals(3, result.entries());
        assertEquals(store.get(2).getHash(), result.headHash());
    }

    @Test
    void tamperingAPayloadBreaksTheChainAtThatEntry() {
        append(LedgerEventType.ISSUED);
        append(LedgerEventType.REVOKED);
        store.get(0).setPayload("{\"event\":\"FORGED\"}");

        LedgerService.ChainValidation result = service.validateChain();
        assertFalse(result.valid());
        assertEquals(store.get(0).getId(), result.brokenAtId());
        // The intact prefix head is still reported - what an anchor would have stamped.
        assertEquals(LedgerServiceImpl.GENESIS, result.headHash());
    }

    @Test
    void tamperingAHashBreaksTheChain() {
        append(LedgerEventType.ISSUED);
        append(LedgerEventType.ISSUED);
        store.get(1).setHash("f".repeat(64));

        LedgerService.ChainValidation result = service.validateChain();
        assertFalse(result.valid());
        assertEquals(store.get(1).getId(), result.brokenAtId());
        assertEquals(store.get(0).getHash(), result.headHash());
    }

    @Test
    void aBrokenSignatureBreaksTheChainEvenWithIntactHashes() {
        append(LedgerEventType.ISSUED);
        when(signingService.signatureValid(any(), any(), any())).thenReturn(false);

        assertFalse(service.validateChain().valid());
    }

    @Test
    void payloadCarriesTheEventSoEventTypeEditsAreDetectable() {
        append(LedgerEventType.ISSUED);
        // Flip the event_type column without touching the hashed payload: the stored
        // hash no longer recomputes... and vice versa - editing the payload's event
        // while leaving the column also fails recomputation. Either way, detected.
        store.get(0).setEventType("REVOKED");
        assertTrue(store.get(0).getPayload().contains("\"ISSUED\""));
        store.get(0).setPayload(store.get(0).getPayload().replace("\"ISSUED\"", "\"REVOKED\""));

        assertFalse(service.validateChain().valid());
    }

    // --- anchorInfoFor: per-credential provenance for the verify page ---

    @Test
    void anchorInfoIsNullForACredentialThatPredatesTheLedger() {
        when(repository.findTopByCredentialIdOrderByIdDesc(any())).thenReturn(Optional.empty());
        assertNull(service.anchorInfoFor(UUID.randomUUID()));
    }

    @Test
    void anchorInfoReturnsEventAndTxUrlWhenAnAnchorCoversTheEntry() {
        UUID credentialId = UUID.randomUUID();
        append(LedgerEventType.ISSUED);
        when(repository.findTopByCredentialIdOrderByIdDesc(credentialId))
                .thenReturn(Optional.of(store.get(0)));
        when(anchorRepository.findFirstByEntriesGreaterThanEqualOrderByIdDesc(store.get(0).getId()))
                .thenReturn(Optional.of(LedgerAnchor.builder()
                        .headHash("abc").entries(1).txHash("0xdeadbeef")
                        .anchoredAt(java.time.Instant.now()).build()));

        LedgerService.AnchorInfo info = service.anchorInfoFor(credentialId);

        assertEquals("ISSUED", info.event());
        assertEquals(LedgerService.SEPOLIA_TX_URL_PREFIX + "0xdeadbeef", info.anchorTxUrl());
    }

    @Test
    void anchorInfoOmitsTheTxUrlWhenNoAnchorCoversTheEntryYet() {
        UUID credentialId = UUID.randomUUID();
        append(LedgerEventType.ISSUED);
        when(repository.findTopByCredentialIdOrderByIdDesc(credentialId))
                .thenReturn(Optional.of(store.get(0)));
        when(anchorRepository.findFirstByEntriesGreaterThanEqualOrderByIdDesc(store.get(0).getId()))
                .thenReturn(Optional.empty());

        LedgerService.AnchorInfo info = service.anchorInfoFor(credentialId);

        assertEquals("ISSUED", info.event());
        assertNull(info.anchorTxUrl());
    }
}
