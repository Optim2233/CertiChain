package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.ShareFieldSelection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ShareFieldSelectionRepository extends JpaRepository<ShareFieldSelection, UUID> {
}
