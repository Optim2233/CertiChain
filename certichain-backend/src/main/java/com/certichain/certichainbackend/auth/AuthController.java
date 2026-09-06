package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.enums.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

import java.time.Duration;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    // Cross-site (frontend and backend on different HTTPS origins, e.g. Vercel
    // + Railway) needs SameSite=None + Secure or the browser drops the cookie.
    // Same-site local dev over http:// needs Secure=false or the cookie never
    // gets set at all - browsers reject Secure cookies on a non-HTTPS origin.
    @Value("${certichain.cookie.cross-site:false}")
    private boolean crossSite;

    private ResponseCookie jwtCookie(String token, long maxAgeSeconds) {
        return ResponseCookie.from("jwt", token)
                .httpOnly(true)
                .secure(crossSite)
                .sameSite(crossSite ? "None" : "Lax")
                .path("/")
                .maxAge(Duration.ofSeconds(maxAgeSeconds))
                .build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletResponse response) {
        var result = authService.authenticate(request.email(), request.password());

        String token = jwtService.issue(result.userId(), result.email(), result.role(), result.institutionId());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie(token, 12 * 60 * 60).toString());

        return ResponseEntity.ok(authService.findByUserId(result.userId()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie("", 0).toString());
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@Valid @RequestBody SignupRequest request, HttpServletResponse response) {
        var result = authService.signup(request.email(), request.password(), request.role(), request.institutionId());

        // Auto-login: set JWT cookie
        String token = jwtService.issue(result.userId(), result.email(), result.role(), result.institutionId());
        response.addHeader(HttpHeaders.SET_COOKIE, jwtCookie(token, 12 * 60 * 60).toString());

        return ResponseEntity.ok(authService.findByUserId(result.userId()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(authService.findByUserId(userId));
    }

    @PostMapping("/password")
    public ResponseEntity<?> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(auth.getName());
        authService.changePassword(userId, request.currentPassword(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password updated"));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.requestPasswordReset(request.email());
        return ResponseEntity.ok(Map.of("message", "If that email exists, a reset link was sent"));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.token(), request.newPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    public record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}

    public record SignupRequest(@Email @NotBlank String email, @NotBlank String password, Role role, UUID institutionId) {}

    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank String newPassword) {}

    public record ForgotPasswordRequest(@Email @NotBlank String email) {}

    public record ResetPasswordRequest(@NotBlank String token, @NotBlank String newPassword) {}
}
