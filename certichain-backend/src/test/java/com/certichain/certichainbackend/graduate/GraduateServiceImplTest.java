package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** The claim-on-signup path: batch issuance to an unregistered email depends on it. */
class GraduateServiceImplTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final CredentialRepository credentialRepository = mock(CredentialRepository.class);
    private final PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);

    private final GraduateServiceImpl service = new GraduateServiceImpl(
            userRepository, credentialRepository, null, null, null, null, null,
            passwordEncoder, null);

    private Credential pendingCredential(String email) {
        return Credential.builder()
                .id(UUID.randomUUID())
                .type(CredentialType.CERTIFICATE)
                .institutionId(UUID.randomUUID())
                .graduateEmail(email)
                .status(CredentialStatus.PENDING_CLAIM)
                .issuedAt(Instant.now())
                .build();
    }

    @Test
    void signupClaimsEveryPendingCredentialForThatEmail() {
        UUID newUserId = UUID.randomUUID();
        when(userRepository.existsByEmail("alice@example.com")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(newUserId);
            return user;
        });

        Credential first = pendingCredential("alice@example.com");
        Credential second = pendingCredential("alice@example.com");
        when(credentialRepository.findByGraduateEmailAndStatus(
                "alice@example.com", CredentialStatus.PENDING_CLAIM))
                .thenReturn(List.of(first, second));

        service.signup("alice@example.com", "password123");

        assertEquals(CredentialStatus.ISSUED, first.getStatus());
        assertEquals(CredentialStatus.ISSUED, second.getStatus());
        assertEquals(newUserId, first.getGraduateUserId());
        assertEquals(newUserId, second.getGraduateUserId());
    }

    @Test
    void signupStoresAHashNeverThePlaintextPassword() {
        when(userRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-value");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(credentialRepository.findByGraduateEmailAndStatus(anyString(), any()))
                .thenReturn(List.of());

        service.signup("alice@example.com", "password123");

        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        org.mockito.Mockito.verify(userRepository).save(saved.capture());
        assertEquals("hashed-value", saved.getValue().getPasswordHash());
        assertNotEquals("password123", saved.getValue().getPasswordHash());
    }

    @Test
    void duplicateEmailIsRejected() {
        when(userRepository.existsByEmail("taken@example.com")).thenReturn(true);

        assertThrows(ValidationException.class,
                () -> service.signup("taken@example.com", "password123"));
    }

    @Test
    void blankCredentialsAreRejected() {
        assertThrows(ValidationException.class, () -> service.signup("", "password123"));
        assertThrows(ValidationException.class, () -> service.signup("alice@example.com", "  "));
    }

    @Test
    void checkPendingCredentialsCountsWithoutCreatingAnything() {
        when(credentialRepository.countByGraduateEmailAndStatus(
                "alice@example.com", CredentialStatus.PENDING_CLAIM)).thenReturn(3);

        assertEquals(3, service.checkPendingCredentials("alice@example.com"));
        org.mockito.Mockito.verify(userRepository, org.mockito.Mockito.never()).save(any());
    }
}
