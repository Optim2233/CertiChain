package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthResult authenticate(String email, String password) {
        // Same error for "no such user" and "wrong password" - never reveal which.
        var user = userRepository.findByEmail(email)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ValidationException("Invalid email or password"));

        return new AuthResult(user.getId(), user.getEmail(), user.getRole(), user.getInstitutionId());
    }

    public AuthResult signup(String email, String password, Role role, UUID institutionId) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new RuntimeException("Email already registered");
        }
        
        String passwordHash = passwordEncoder.encode(password);
        
        var user = User.builder()
                .email(email)
                .passwordHash(passwordHash)
                .role(role)
                .institutionId(institutionId)
                .createdAt(Instant.now())
                .lastBriefedAt(Instant.now())
                .build();
        
        var savedUser = userRepository.save(user);
        
        return new AuthResult(savedUser.getId(), savedUser.getEmail(), savedUser.getRole(), savedUser.getInstitutionId());
    }

    public UserResponse findByUserId(UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new UserResponse(user.getId(), user.getEmail(), user.getRole(), user.getInstitutionId());
    }

    public void changePassword(UUID userId, String currentPassword, String newPassword) {
        if (newPassword == null || newPassword.isBlank()) {
            throw new ValidationException("newPassword is required");
        }
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ValidationException("Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    public record AuthResult(UUID userId, String email, Role role, UUID institutionId) {}

    public record UserResponse(UUID userId, String email, Role role, UUID institutionId) {}
}
