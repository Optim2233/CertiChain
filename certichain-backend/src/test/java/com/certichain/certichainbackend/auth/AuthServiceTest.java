package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.PasswordResetToken;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.PasswordResetTokenRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Auth rules: login secrecy, password hashing, reset-token lifecycle. No DB, no HTTP. */
class AuthServiceTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
    private final PasswordResetTokenRepository resetTokenRepository = mock(PasswordResetTokenRepository.class);
    private final EmailService emailService = mock(EmailService.class);

    private final AuthService service = new AuthService(
            userRepository, passwordEncoder, resetTokenRepository, emailService);

    {
        ReflectionTestUtils.setField(service, "frontendUrl", "http://localhost:3000");
    }

    private User user(String email, String hash) {
        return User.builder()
                .id(UUID.randomUUID()).email(email).passwordHash(hash)
                .role(Role.GRADUATE).createdAt(Instant.now()).build();
    }

    // --- authenticate ---

    @Test
    void authenticateSucceedsWithRightPassword() {
        User u = user("a@x.com", "hash");
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("pw", "hash")).thenReturn(true);

        AuthService.AuthResult result = service.authenticate("a@x.com", "pw");

        assertEquals(u.getId(), result.userId());
        assertEquals(Role.GRADUATE, result.role());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSameError() {
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(user("a@x.com", "hash")));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        ValidationException wrongPw = assertThrows(ValidationException.class,
                () -> service.authenticate("a@x.com", "bad"));

        when(userRepository.findByEmail("ghost@x.com")).thenReturn(Optional.empty());
        ValidationException noUser = assertThrows(ValidationException.class,
                () -> service.authenticate("ghost@x.com", "pw"));

        assertEquals(wrongPw.getMessage(), noUser.getMessage());
    }

    // --- signup ---

    @Test
    void signupStoresHashNotPlaintext() {
        when(userRepository.findByEmail("new@x.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("secret12")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        service.signup("new@x.com", "secret12", Role.GRADUATE, null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        assertEquals("hashed", saved.getValue().getPasswordHash());
        assertNotEquals("secret12", saved.getValue().getPasswordHash());
    }

    @Test
    void signupRejectsDuplicateEmail() {
        when(userRepository.findByEmail("taken@x.com")).thenReturn(Optional.of(user("taken@x.com", "h")));
        assertThrows(RuntimeException.class,
                () -> service.signup("taken@x.com", "secret12", Role.GRADUATE, null));
        verify(userRepository, never()).save(any());
    }

    // --- changePassword ---

    @Test
    void changePasswordRequiresCorrectCurrentPassword() {
        User u = user("a@x.com", "old-hash");
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("wrong", "old-hash")).thenReturn(false);

        assertThrows(ValidationException.class,
                () -> service.changePassword(u.getId(), "wrong", "newpass12"));
        verify(userRepository, never()).save(any());
    }

    @Test
    void changePasswordRejectsBlankNewPassword() {
        assertThrows(ValidationException.class,
                () -> service.changePassword(UUID.randomUUID(), "cur", "  "));
    }

    @Test
    void changePasswordWritesNewHash() {
        User u = user("a@x.com", "old-hash");
        when(userRepository.findById(u.getId())).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("cur", "old-hash")).thenReturn(true);
        when(passwordEncoder.encode("newpass12")).thenReturn("new-hash");

        service.changePassword(u.getId(), "cur", "newpass12");

        assertEquals("new-hash", u.getPasswordHash());
        verify(userRepository).save(u);
    }

    // --- requestPasswordReset ---

    @Test
    void requestResetForUnknownEmailIsSilentNoOp() {
        when(userRepository.findByEmail("ghost@x.com")).thenReturn(Optional.empty());

        service.requestPasswordReset("ghost@x.com");

        verify(resetTokenRepository, never()).save(any());
        verify(emailService, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetSendsHashedTokenAndEmailsLink() {
        User u = user("a@x.com", "h");
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(u));
        when(resetTokenRepository.countByUserIdAndCreatedAtAfter(eq(u.getId()), any())).thenReturn(0L);

        service.requestPasswordReset("a@x.com");

        ArgumentCaptor<PasswordResetToken> tok = ArgumentCaptor.forClass(PasswordResetToken.class);
        verify(resetTokenRepository).save(tok.capture());
        // stored value is a hash, never the raw token that goes in the link
        assertEquals(64, tok.getValue().getTokenHash().length()); // sha-256 hex
        verify(emailService).send(eq("a@x.com"), anyString(), anyString());
    }

    @Test
    void requestResetRateLimitsAfterThreeInWindow() {
        User u = user("a@x.com", "h");
        when(userRepository.findByEmail("a@x.com")).thenReturn(Optional.of(u));
        when(resetTokenRepository.countByUserIdAndCreatedAtAfter(eq(u.getId()), any())).thenReturn(3L);

        assertThrows(ValidationException.class, () -> service.requestPasswordReset("a@x.com"));
        verify(resetTokenRepository, never()).save(any());
    }

    // --- resetPassword ---

    @Test
    void resetPasswordRejectsShortPassword() {
        assertThrows(ValidationException.class, () -> service.resetPassword("tok", "short"));
    }

    @Test
    void resetPasswordRejectsUnknownToken() {
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.empty());
        assertThrows(ValidationException.class, () -> service.resetPassword("tok", "longenough8"));
    }

    @Test
    void resetPasswordRejectsUsedToken() {
        PasswordResetToken t = PasswordResetToken.builder()
                .userId(UUID.randomUUID()).tokenHash("h")
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .usedAt(Instant.now()).createdAt(Instant.now()).build();
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(t));

        assertThrows(ValidationException.class, () -> service.resetPassword("tok", "longenough8"));
    }

    @Test
    void resetPasswordRejectsExpiredToken() {
        PasswordResetToken t = PasswordResetToken.builder()
                .userId(UUID.randomUUID()).tokenHash("h")
                .expiresAt(Instant.now().minus(1, ChronoUnit.MINUTES))
                .createdAt(Instant.now()).build();
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(t));

        assertThrows(ValidationException.class, () -> service.resetPassword("tok", "longenough8"));
    }

    @Test
    void resetPasswordSetsNewHashAndConsumesToken() {
        UUID userId = UUID.randomUUID();
        PasswordResetToken t = PasswordResetToken.builder()
                .userId(userId).tokenHash("h")
                .expiresAt(Instant.now().plus(10, ChronoUnit.MINUTES))
                .createdAt(Instant.now()).build();
        User u = user("a@x.com", "old");
        when(resetTokenRepository.findByTokenHash(anyString())).thenReturn(Optional.of(t));
        when(userRepository.findById(userId)).thenReturn(Optional.of(u));
        when(passwordEncoder.encode("longenough8")).thenReturn("new-hash");

        service.resetPassword("tok", "longenough8");

        assertEquals("new-hash", u.getPasswordHash());
        verify(userRepository).save(u);
        org.junit.jupiter.api.Assertions.assertNotNull(t.getUsedAt());
        verify(resetTokenRepository).save(t);
    }

    @Test
    void findByUserIdThrowsWhenMissing() {
        UUID id = UUID.randomUUID();
        when(userRepository.findById(id)).thenReturn(Optional.empty());
        assertThrows(ResourceNotFoundException.class, () -> service.findByUserId(id));
    }
}
