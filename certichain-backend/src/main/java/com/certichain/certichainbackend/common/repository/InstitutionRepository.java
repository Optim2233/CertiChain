package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {
    Page<Institution> findByStatus(InstitutionStatus status, Pageable pageable);

    /** Public directory: APPROVED + SUSPENDED only. */
    List<Institution> findByStatusInOrderByNameAsc(Collection<InstitutionStatus> statuses);
}
