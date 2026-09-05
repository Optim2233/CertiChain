package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.CredentialField;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface CredentialFieldRepository extends JpaRepository<CredentialField, UUID> {
    List<CredentialField> findByCredentialIdOrderByMerkleIndex(UUID credentialId);
    List<CredentialField> findByCredentialIdIn(Collection<UUID> credentialIds);
    List<CredentialField> findByCredentialIdInAndFieldName(Collection<UUID> credentialIds, String fieldName);
    List<CredentialField> findByFieldValueIvIsNull();
    void deleteByCredentialId(UUID credentialId);
}
