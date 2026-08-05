package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.InstitutionDocument;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface InstitutionDocumentRepository extends JpaRepository<InstitutionDocument, UUID> {
}
