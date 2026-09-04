package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.ShareFieldSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface ShareFieldSelectionRepository extends JpaRepository<ShareFieldSelection, UUID> {
    List<ShareFieldSelection> findByShareId(UUID shareId);
    List<ShareFieldSelection> findByShareIdIn(Collection<UUID> shareIds);
}
