package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.Credential;
import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.enums.CredentialStatus;
import com.certichain.certichainbackend.common.enums.CredentialType;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.CredentialRepository;
import com.certichain.certichainbackend.common.repository.UserRepository;
import com.certichain.certichainbackend.common.service.impl.PiiCryptoService;
import com.certichain.certichainbackend.support.TestCrypto;
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

private final com.certichain.certichainbackend.common.service.SupabaseStorageService storageService =
            mock(com.certichain.certichainbackend.common.service.SupabaseStorageService.class);
    private final com.certichain.certichainbackend.auth.CurrentUser currentUser =
            mock(com.certichain.certichainbackend.auth.CurrentUser.class);
    private final PiiCryptoService pii = TestCrypto.pii();

    // null credentialFieldCryptoService: none of these tests touch getCredentialFields(),
    // the only method that calls it.
    private final GraduateServiceImpl service = new GraduateServiceImpl(
            userRepository, credentialRepository, null, null, null, null, null, null, null,
            storageService, passwordEncoder, currentUser, null, pii);

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
        when(userRepository.existsByEmailHmac(pii.emailHmac("alice@example.com"))).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(newUserId);
            return user;
        });

        Credential first = pendingCredential("alice@example.com");
        Credential second = pendingCredential("alice@example.com");
        when(credentialRepository.findByGraduateEmailHmacAndStatus(
                pii.emailHmac("alice@example.com"), CredentialStatus.PENDING_CLAIM))
                .thenReturn(List.of(first, second));

        service.signup("alice@example.com", "password123", null, null, null);

        assertEquals(CredentialStatus.ISSUED, first.getStatus());
        assertEquals(CredentialStatus.ISSUED, second.getStatus());
        assertEquals(newUserId, first.getGraduateUserId());
        assertEquals(newUserId, second.getGraduateUserId());
    }

    @Test
    void signupStoresAHashNeverThePlaintextPassword() {
        when(userRepository.existsByEmailHmac(anyString())).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("hashed-value");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> {
            User user = inv.getArgument(0);
            user.setId(UUID.randomUUID());
            return user;
        });
        when(credentialRepository.findByGraduateEmailHmacAndStatus(anyString(), any()))
                .thenReturn(List.of());

        service.signup("alice@example.com", "password123", null, null, null);

        org.mockito.ArgumentCaptor<User> saved = org.mockito.ArgumentCaptor.forClass(User.class);
        org.mockito.Mockito.verify(userRepository).save(saved.capture());
        assertEquals("hashed-value", saved.getValue().getPasswordHash());
        assertNotEquals("password123", saved.getValue().getPasswordHash());
    }

    @Test
    void duplicateEmailIsRejected() {
        when(userRepository.existsByEmailHmac(pii.emailHmac("taken@example.com"))).thenReturn(true);

        assertThrows(ValidationException.class,
                () -> service.signup("taken@example.com", "password123", null, null, null));
    }

    @Test
    void blankCredentialsAreRejected() {
        assertThrows(ValidationException.class, () -> service.signup("", "password123", null, null, null));
        assertThrows(ValidationException.class, () -> service.signup("alice@example.com", "  ", null, null, null));
    }

    @Test
    void checkPendingCredentialsCountsWithoutCreatingAnything() {
        when(credentialRepository.countByGraduateEmailHmacAndStatus(
                pii.emailHmac("alice@example.com"), CredentialStatus.PENDING_CLAIM)).thenReturn(3);

        assertEquals(3, service.checkPendingCredentials("alice@example.com"));
        org.mockito.Mockito.verify(userRepository, org.mockito.Mockito.never()).save(any());
    }

    // --- profile ---

    private User meWith(String first, String last, String phone, String img) {
        UUID id = UUID.randomUUID();
        when(currentUser.id()).thenReturn(id);
        User u = User.builder().id(id).email("me@x.com").firstName(first).lastName(last)
                .phone(phone).profileImageUrl(img).build();
        when(userRepository.findById(id)).thenReturn(java.util.Optional.of(u));
        return u;
    }

    @Test
    void updateProfileTrimsAndPersistsNameAndPhone() {
        User u = meWith(null, null, null, null);

        GraduateProfileResponse r = service.updateOwnProfile("  Ada ", " Lovelace ", " +1 555 ", null, null);

        // stored ciphertext, readable back through decrypt + the response DTO
        assertEquals("Ada", pii.decryptUserField(u.getFirstName()));
        assertEquals("Lovelace", pii.decryptUserField(u.getLastName()));
        assertEquals("+1 555", pii.decryptUserField(u.getPhone()));
        assertEquals("Ada", r.firstName());
    }

    @Test
    void blankProfileImageUrlClearsAnExistingPhoto() {
        User u = meWith("Ada", "L", null, "https://old/pic.jpg");

        service.updateOwnProfile(null, null, null, "", null);

        assertEquals(null, u.getProfileImageUrl());
    }

    @Test
    void uploadedFileRoutesToStorageAndStoresTheReturnedUrl() {
        User u = meWith("Ada", "L", null, null);
        org.springframework.web.multipart.MultipartFile file =
                mock(org.springframework.web.multipart.MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(storageService.uploadImage(anyString(), any())).thenReturn("https://cdn/new.png");

        service.updateOwnProfile(null, null, null, null, file);

        assertEquals("https://cdn/new.png", u.getProfileImageUrl());
    }

    @Test
    void nonHttpProfileImageUrlIsRejected() {
        meWith(null, null, null, null);
        assertThrows(ValidationException.class,
                () -> service.updateOwnProfile(null, null, null, "ftp://x/y.png", null));
    }
}
