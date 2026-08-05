package com.certichain.certichainbackend.common.repository;

import com.certichain.certichainbackend.common.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
}
