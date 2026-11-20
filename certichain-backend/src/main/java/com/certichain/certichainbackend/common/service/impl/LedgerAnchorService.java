package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.LedgerAnchor;
import com.certichain.certichainbackend.common.repository.LedgerAnchorRepository;
import com.certichain.certichainbackend.common.service.LedgerService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.protocol.http.HttpService;
import org.web3j.tx.gas.DefaultGasProvider;
import org.web3j.utils.Numeric;

import java.math.BigInteger;
import java.time.Instant;

/**
 * Anchors the ledger chain head to Ethereum Sepolia: a zero-value self-transaction
 * whose data field is the head hash. Anyone can then prove, from a public blockchain
 * the backend does not control, that the ledger had exactly that head at that time -
 * which is what defeats the "rewrite the whole ledger from scratch" attack that a
 * local-only chain cannot (see EXPLAINER.md §8, missing pillar 3).
 *
 * <p>Flag-gated: dormant unless {@code ANCHOR_ENABLED=true} and the RPC URL + a funded
 * throwaway private key are set. A row is written only after the send succeeds, so an
 * RPC outage just delays the anchor to the next cycle. Anchoring is deliberately
 * periodic and async - issuance never waits on a blockchain round trip.
 *
 * <p>shortcut: legacy (type-0) transactions and a hardcoded Sepolia chainId/explorer;
 * switch to EIP-1559 + mainnet config if this ever goes to production.
 */
@Slf4j
@Service
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.anchor.enabled", havingValue = "true")
public class LedgerAnchorService {

    private static final long SEPOLIA_CHAIN_ID = 11155111L;
    private static final String SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx/";

    private final LedgerService ledgerService;
    private final LedgerAnchorRepository anchorRepository;

    @Value("${app.anchor.rpc-url}")
    private String rpcUrl;

    @Value("${app.anchor.private-key}")
    private String privateKey;

    private Web3j web3j;
    private Credentials credentials;

    /** Built lazily so startup never blocks on a cold RPC handshake; validates the key immediately. */
    private synchronized Web3j web3j() {
        if (web3j == null) {
            web3j = Web3j.build(new HttpService(rpcUrl));
        }
        return web3j;
    }

    private synchronized Credentials credentials() {
        if (credentials == null) {
            // Throws on a malformed key - fail fast at first use rather than per anchor.
            credentials = Credentials.create(privateKey.trim());
        }
        return credentials;
    }

    // 1-minute cycle: cheap on testnet, and every run that produced no new head is a
    // no-op (validate + skip), so this only ever spends gas when something happened.
    @Scheduled(fixedDelay = 60_000, initialDelay = 60_000)
    public void anchorChainHead() {
        LedgerService.ChainValidation chain = ledgerService.validateChain();
        // An invalid chain is never anchored - anchor the truth we know is intact
        // after the investigation, not the current state of a tampered table.
        if (!chain.valid()) {
            log.warn("Ledger chain invalid (brokenAtId {}) - skipping anchor cycle", chain.brokenAtId());
            return;
        }
        if (chain.entries() == 0
                || anchorRepository.findTopByOrderByIdDesc()
                        .map(a -> a.getHeadHash().equals(chain.headHash()))
                        .orElse(false)) {
            return; // nothing new since the last anchor
        }
        try {
            String txHash = sendAnchorTransaction(chain.headHash());
            saveAnchor(chain, txHash);
            log.info("Anchored ledger head {} ({} entries) on Sepolia: {}{}",
                    chain.headHash(), chain.entries(), SEPOLIA_EXPLORER_TX, txHash);
        } catch (Exception e) {
            // No anchor row is written, so the next cycle retries the same head.
            log.error("Failed to anchor ledger head {}: {}", chain.headHash(), e.getMessage());
        }
    }

    /** One zero-value self-send carrying the 32-byte head hash as calldata, signed locally. */
    protected String sendAnchorTransaction(String headHash) throws Exception {
        String from = credentials().getAddress();
        BigInteger nonce = web3j().ethGetTransactionCount(from, DefaultBlockParameterName.PENDING)
                .send().getTransactionCount();
        BigInteger gasPrice = web3j().ethGasPrice().send().getGasPrice();
        // Signed locally and sent raw - public RPCs never hold the anchor key.
        RawTransaction rawTx = RawTransaction.createTransaction(
                nonce, gasPrice, DefaultGasProvider.GAS_LIMIT,
                from, BigInteger.ZERO, Numeric.prependHexPrefix(headHash));
        byte[] signed = TransactionEncoder.signMessage(rawTx, SEPOLIA_CHAIN_ID, credentials());
        EthSendTransaction response = web3j()
                .ethSendRawTransaction(Numeric.toHexString(signed)).send();
        if (response.hasError()) {
            throw new IllegalStateException("Sepolia RPC rejected the anchor tx: "
                    + response.getError().getMessage());
        }
        return response.getTransactionHash();
    }

    @Transactional
    protected void saveAnchor(LedgerService.ChainValidation chain, String txHash) {
        anchorRepository.save(LedgerAnchor.builder()
                .headHash(chain.headHash())
                .entries(chain.entries())
                .txHash(txHash)
                .anchoredAt(Instant.now())
                .build());
    }
}
