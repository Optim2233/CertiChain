package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.LedgerAnchor;
import com.certichain.certichainbackend.common.repository.LedgerAnchorRepository;
import com.certichain.certichainbackend.common.service.LedgerService;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.spy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Skip/retry logic only - the actual Web3j send is live-verified against Sepolia. */
class LedgerAnchorServiceTest {

    private final LedgerService ledgerService = mock(LedgerService.class);
    private final LedgerAnchorRepository anchorRepository = mock(LedgerAnchorRepository.class);
    private final LedgerAnchorService service =
            spy(new LedgerAnchorService(ledgerService, anchorRepository));

    private void chainIs(boolean valid, long entries, String head) {
        when(ledgerService.validateChain())
                .thenReturn(new LedgerService.ChainValidation(valid, entries, null, head));
    }

    @Test
    void anchorsANewValidHead() throws Exception {
        chainIs(true, 3, "abc");
        when(anchorRepository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        doReturn("tx-hash").when(service).sendAnchorTransaction(anyString());

        service.anchorChainHead();

        verify(service).sendAnchorTransaction("abc");
        verify(anchorRepository).save(any(LedgerAnchor.class));
    }

    @Test
    void neverAnchorsAnInvalidChain() throws Exception {
        chainIs(false, 3, "abc");

        service.anchorChainHead();

        verify(service, never()).sendAnchorTransaction(anyString());
        verify(anchorRepository, never()).save(any());
    }

    @Test
    void neverAnchorsAnEmptyChain() throws Exception {
        chainIs(true, 0, "000");

        service.anchorChainHead();

        verify(service, never()).sendAnchorTransaction(anyString());
    }

    @Test
    void neverReAnchorsAnUnchangedHead() throws Exception {
        chainIs(true, 3, "abc");
        when(anchorRepository.findTopByOrderByIdDesc()).thenReturn(Optional.of(LedgerAnchor.builder()
                .headHash("abc").entries(3).txHash("old-tx")
                .anchoredAt(Instant.now()).build()));

        service.anchorChainHead();

        verify(service, never()).sendAnchorTransaction(anyString());
        verify(anchorRepository, never()).save(any());
    }

    @Test
    void failedSendWritesNoAnchorRowSoTheNextCycleRetries() throws Exception {
        chainIs(true, 3, "abc");
        when(anchorRepository.findTopByOrderByIdDesc()).thenReturn(Optional.empty());
        doThrow(new IllegalStateException("rpc down")).when(service).sendAnchorTransaction(anyString());

        service.anchorChainHead();

        verify(anchorRepository, never()).save(any());
    }
}
