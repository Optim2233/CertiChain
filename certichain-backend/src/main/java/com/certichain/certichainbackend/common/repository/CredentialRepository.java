package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.Credential;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CredentialRepository extends JpaRepository<Credential, UUID> {
}
