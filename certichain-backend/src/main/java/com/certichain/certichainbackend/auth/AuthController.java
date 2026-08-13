package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.enums.Role;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request, HttpServletResponse response) {
        var result = authService.authenticate(request.email(), request.password());
        
        String token = jwtService.issue(result.userId(), result.email(), result.role(), result.institutionId());
        
        // Set JWT in HTTP-only cookie
        var cookie = new jakarta.servlet.http.Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false); // Set to true in production with HTTPS
        cookie.setPath("/");
        cookie.setMaxAge(12 * 60 * 60); // 12 hours
        response.addCookie(cookie);

        return ResponseEntity.ok(new AuthService.UserResponse(
                result.userId(), result.email(), result.role(), result.institutionId()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest request, HttpServletResponse response) {
        // Clear the JWT cookie
        var cookie = new jakarta.servlet.http.Cookie("jwt", "");
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(0); // Expire immediately
        response.addCookie(cookie);
        
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody SignupRequest request, HttpServletResponse response) {
        var result = authService.signup(request.email(), request.password(), request.role(), request.institutionId());
        
        // Auto-login: set JWT cookie
        String token = jwtService.issue(result.userId(), result.email(), result.role(), result.institutionId());
        
        var cookie = new jakarta.servlet.http.Cookie("jwt", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(false);
        cookie.setPath("/");
        cookie.setMaxAge(12 * 60 * 60); // 12 hours
        response.addCookie(cookie);

        return ResponseEntity.ok(new AuthService.UserResponse(
                result.userId(), result.email(), result.role(), result.institutionId()));
    }

    @GetMapping("/me")
    public ResponseEntity<AuthService.UserResponse> me() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        UUID userId = UUID.fromString(auth.getName());
        return ResponseEntity.ok(authService.findByUserId(userId));
    }

    public record LoginRequest(String email, String password) {}
    
    public record SignupRequest(String email, String password, Role role, UUID institutionId) {}
}
