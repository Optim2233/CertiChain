package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.LedgerAnchor;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LedgerAnchorRepository extends JpaRepository<LedgerAnchor, Long> {

    /** The most recent on-chain anchor, or empty when nothing has been anchored yet. */
    Optional<LedgerAnchor> findTopByOrderByIdDesc();

    /**
     * The most recent anchor whose chain head covered position {@code entries} - i.e.
     * an anchor that provably includes a ledger entry at that position (entry ids are
     * sequential from 1 and anchors store the chain length they covered).
     */
    Optional<LedgerAnchor> findFirstByEntriesGreaterThanEqualOrderByIdDesc(long entries);
}
