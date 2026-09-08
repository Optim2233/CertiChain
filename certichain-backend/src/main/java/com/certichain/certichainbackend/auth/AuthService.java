package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.entity.PasswordResetToken;
import com.certichain.certichainbackend.common.repository.PasswordResetTokenRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;
    private final PiiCryptoService piiCryptoService;

    // Base URL stamped into password-reset links. Separate from the dev LAN frontend
    // URL - emailed links must be publicly reachable (see EMAIL_PUBLIC_BASE_URL).
    @Value("${certichain.email.base-url:${certichain.frontend-url:http://localhost:3000}}")
    private String emailBaseUrl;

    public AuthResult authenticate(String email, String password) {
        // Same error for "no such user" and "wrong password" - never reveal which.
        // Email is ciphertext in the DB: look up by HMAC blind index, decrypt for the result.
        var user = userRepository.findByEmailHmac(piiCryptoService.emailHmac(email))
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ValidationException("Invalid email or password"));

        return new AuthResult(user.getId(), piiCryptoService.decryptUserField(user.getEmail()),
                user.getRole(), user.getInstitutionId());
    }

    public AuthResult signup(String email, String password, Role role, UUID institutionId) {
        String norm = PiiCryptoService.normalizeEmail(email);
        if (userRepository.existsByEmailHmac(piiCryptoService.emailHmac(norm))) {
            throw new ValidationException("Email already registered");
        }

        String passwordHash = passwordEncoder.encode(password);

        var user = User.builder()
                .email(piiCryptoService.encryptUserField(norm))
                .emailHmac(piiCryptoService.emailHmac(norm))
                .passwordHash(passwordHash)
                .role(role)
                .institutionId(institutionId)
                .createdAt(Instant.now())
                .lastBriefedAt(Instant.now())
                .build();

        var savedUser = userRepository.save(user);

        return new AuthResult(savedUser.getId(), norm, savedUser.getRole(), savedUser.getInstitutionId());
    }

    public UserResponse findByUserId(UUID userId) {
        var user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return new UserResponse(user.getId(), piiCryptoService.decryptUserField(user.getEmail()),
                user.getRole(), user.getInstitutionId(),
                piiCryptoService.decryptUserField(user.getFirstName()),
                piiCryptoService.decryptUserField(user.getLastName()), user.getProfileImageUrl());
    }

    @CacheEvict(cacheNames = "currentUser", allEntries = true)
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

    public void requestPasswordReset(String email) {
        var userOpt = userRepository.findByEmailHmac(piiCryptoService.emailHmac(email));
        if (userOpt.isEmpty()) {
            return; // don't reveal whether email exists
        }
        var user = userOpt.get();
        String plainEmail = piiCryptoService.decryptUserField(user.getEmail());
        // ponytail: simple rate limit - max 3 tokens per 15 min per user
        long recent = passwordResetTokenRepository.countByUserIdAndCreatedAtAfter(
                user.getId(), Instant.now().minus(Duration.ofMinutes(15)));
        if (recent >= 3) {
            throw new ValidationException("Too many reset requests. Try again later.");
        }
        String rawToken = UUID.randomUUID().toString();
        String hash = sha256(rawToken);
        var token = PasswordResetToken.builder()
                .userId(user.getId())
                .tokenHash(hash)
                .expiresAt(Instant.now().plus(Duration.ofMinutes(30)))
                .createdAt(Instant.now())
                .build();
        passwordResetTokenRepository.save(token);
        String link = emailBaseUrl.replaceAll("/$", "") + "/reset-password?token=" + rawToken;
        try {
            ((com.certichain.certichainbackend.common.service.impl.EmailServiceImpl) emailService).sendPasswordReset(plainEmail, link);
        } catch (Exception ex) {
            emailService.send(plainEmail, "Reset your CertiChain password",
                    "Click the link to reset your password (expires in 30 minutes):\n" + link + "\n\nIf you didn't request this, ignore this email.");
        }
        log.info("Password reset link for {}: {}", user.getId(), link);
    }

    public void resetPassword(String rawToken, String newPassword) {
        if (newPassword == null || newPassword.length() < 8) {
            throw new ValidationException("Password must be at least 8 characters");
        }
        String hash = sha256(rawToken);
        var token = passwordResetTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> new ValidationException("Invalid or expired reset link"));
        if (token.getUsedAt() != null) {
            throw new ValidationException("Reset link already used");
        }
        if (token.getExpiresAt().isBefore(Instant.now())) {
            throw new ValidationException("Reset link has expired");
        }
        var user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        token.setUsedAt(Instant.now());
        passwordResetTokenRepository.save(token);
    }

    private static String sha256(String value) {
        try {
            var digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public record AuthResult(UUID userId, String email, Role role, UUID institutionId) {}

    public record UserResponse(UUID userId, String email, Role role, UUID institutionId,
                               String firstName, String lastName, String profileImageUrl) {}
}
