package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.DisputeFlag;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface DisputeFlagRepository extends JpaRepository<DisputeFlag, UUID> {
}
