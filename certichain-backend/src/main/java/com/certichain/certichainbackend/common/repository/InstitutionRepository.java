package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface InstitutionRepository extends JpaRepository<Institution, UUID> {

    Page<Institution> findByStatus(InstitutionStatus status, Pageable pageable);

    List<Institution> findByStatusAndDekWrappedIsNull(InstitutionStatus status);

    List<Institution> findByDekWrappedIsNull();

    List<Institution> findByDekWrappedIsNotNull();

    @Query("SELECT i FROM Institution i WHERE lower(i.name) LIKE lower(concat('%', :q, '%'))")
    Page<Institution> searchByName(@Param("q") String q, Pageable pageable);

    @Query("SELECT i FROM Institution i WHERE i.status = :status "
            + "AND lower(i.name) LIKE lower(concat('%', :q, '%'))")
    Page<Institution> searchByNameAndStatus(@Param("q") String q,
                                            @Param("status") InstitutionStatus status,
                                            Pageable pageable);

    /** Public directory: APPROVED + SUSPENDED only. */
    List<Institution> findByStatusInOrderByNameAsc(Collection<InstitutionStatus> statuses);

    int countByStatus(InstitutionStatus status);
}
