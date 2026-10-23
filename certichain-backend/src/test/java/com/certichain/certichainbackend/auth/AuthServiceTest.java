package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.PasswordResetToken;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ResourceNotFoundException;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.PasswordResetTokenRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.EmailService;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import com.certichain.certichainbackend.support.TestCrypto;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
    private final PiiCryptoService pii = TestCrypto.pii();
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);

    private final AuthService service = new AuthService(
            userRepository, passwordEncoder, resetTokenRepository, emailService, pii,
            credentialRepository);

    {
        ReflectionTestUtils.setField(service, "emailBaseUrl", "http://localhost:3000");
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
        when(userRepository.findByEmailHmac(pii.emailHmac("a@x.com"))).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("pw", "hash")).thenReturn(true);

        AuthService.AuthResult result = service.authenticate("a@x.com", "pw");

        assertEquals(u.getId(), result.userId());
        assertEquals(Role.GRADUATE, result.role());
    }

    @Test
    void wrongPasswordAndUnknownEmailGiveTheSameError() {
        when(userRepository.findByEmailHmac(pii.emailHmac("a@x.com"))).thenReturn(Optional.of(user("a@x.com", "hash")));
        when(passwordEncoder.matches(anyString(), anyString())).thenReturn(false);
        ValidationException wrongPw = assertThrows(ValidationException.class,
                () -> service.authenticate("a@x.com", "bad"));

        when(userRepository.findByEmailHmac(pii.emailHmac("ghost@x.com"))).thenReturn(Optional.empty());
        ValidationException noUser = assertThrows(ValidationException.class,
                () -> service.authenticate("ghost@x.com", "pw"));

        assertEquals(wrongPw.getMessage(), noUser.getMessage());
    }

    // --- signup ---

    @Test
    void signupStoresHashNotPlaintext() {
        when(userRepository.findByEmailHmac(pii.emailHmac("new@x.com"))).thenReturn(Optional.empty());
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
        when(userRepository.existsByEmailHmac(pii.emailHmac("taken@x.com"))).thenReturn(true);
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
        when(userRepository.findByEmailHmac(pii.emailHmac("ghost@x.com"))).thenReturn(Optional.empty());

        service.requestPasswordReset("ghost@x.com");

        verify(resetTokenRepository, never()).save(any());
        verify(emailService, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void requestResetSendsHashedTokenAndEmailsLink() {
        User u = user("a@x.com", "h");
        when(userRepository.findByEmailHmac(pii.emailHmac("a@x.com"))).thenReturn(Optional.of(u));
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
        when(userRepository.findByEmailHmac(pii.emailHmac("a@x.com"))).thenReturn(Optional.of(u));
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

    // --- encrypted-email blind index ---

    @Test
    void loginIsCaseInsensitiveViaHmacIndex() {
        User u = user("a@x.com", "hash");
        when(userRepository.findByEmailHmac(pii.emailHmac("a@x.com"))).thenReturn(Optional.of(u));
        when(passwordEncoder.matches("pw", "hash")).thenReturn(true);

        AuthService.AuthResult result = service.authenticate("A@X.COM", "pw");

        assertEquals(u.getId(), result.userId());
        assertEquals("a@x.com", result.email());
    }

    @Test
    void signupStoresCiphertextEmailPlusHmac() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode("secret12")).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        AuthService.AuthResult result = service.signup("New@X.Com", "secret12", Role.GRADUATE, null);

        ArgumentCaptor<User> saved = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(saved.capture());
        // normalized to lowercase, encrypted at rest, indexed by deterministic HMAC
        assertEquals("new@x.com", result.email());
        org.junit.jupiter.api.Assertions.assertNotEquals("new@x.com", saved.getValue().getEmail());
        assertEquals(pii.emailHmac("new@x.com"), saved.getValue().getEmailHmac());
        assertEquals("new@x.com", pii.decryptUserField(saved.getValue().getEmail()));
    }

    // --- signup claims credentials issued before the account existed ---
    // Regression: the graduate registration page posts to /api/auth/signup, but the claim
    // loop used to live only in GraduateServiceImpl.signup, so those users saw an empty
    // wallet. See audit/findings.md #1.

    private Credential pendingCredential() {
        return Credential.builder()
                .id(UUID.randomUUID())
                .status(CredentialStatus.PENDING_CLAIM)
                .build();
    }

    @Test
    void signupClaimsPendingCredentialsForGraduates() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });
        Credential a = pendingCredential();
        Credential b = pendingCredential();
        when(credentialRepository.findByGraduateEmailHmacAndStatus(
                pii.emailHmac("grad@x.com"), CredentialStatus.PENDING_CLAIM))
                .thenReturn(List.of(a, b));

        AuthService.AuthResult result = service.signup("grad@x.com", "password1", Role.GRADUATE, null);

        // Both credentials are attached to the new account and flipped out of PENDING_CLAIM.
        for (Credential c : List.of(a, b)) {
            assertEquals(CredentialStatus.ISSUED, c.getStatus());
            assertEquals(result.userId(), c.getGraduateUserId());
        }
        verify(credentialRepository).saveAll(List.of(a, b));
    }

    @Test
    void signupWithNothingPendingWritesNoCredentials() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });
        when(credentialRepository.findByGraduateEmailHmacAndStatus(anyString(), any()))
                .thenReturn(List.of());

        service.signup("fresh@x.com", "password1", Role.GRADUATE, null);

        verify(credentialRepository, never()).saveAll(any());
    }

    @Test
    void signupDoesNotClaimForNonGraduateRoles() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });

        service.signup("registrar@x.com", "password1", Role.INSTITUTION, UUID.randomUUID());

        // An institution account must never sweep up credentials by email.
        verify(credentialRepository, never()).findByGraduateEmailHmacAndStatus(anyString(), any());
        verify(credentialRepository, never()).saveAll(any());
    }

    @Test
    void signupNormalizesEmailBeforeLookingUpPendingCredentials() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hash");
        when(userRepository.save(any(User.class))).thenAnswer(i -> {
            User u = i.getArgument(0);
            if (u.getId() == null) u.setId(UUID.randomUUID());
            return u;
        });
        Credential c = pendingCredential();
        // Issued against the normalized address; signup arrives mixed-case with padding.
        when(credentialRepository.findByGraduateEmailHmacAndStatus(
                pii.emailHmac("grad@x.com"), CredentialStatus.PENDING_CLAIM))
                .thenReturn(List.of(c));

        service.signup("  GRAD@X.com  ", "password1", Role.GRADUATE, null);

        assertEquals(CredentialStatus.ISSUED, c.getStatus());
    }
}
