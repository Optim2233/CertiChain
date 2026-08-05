package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Institution;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {
}
