package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.entity.User;
import com.certichain.certichainbackend.common.exception.ValidationException;
import com.certichain.certichainbackend.common.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

/**
 * Login for all three authenticated roles. Verifier needs no account at all, so there is
 * deliberately no verifier branch here.
 *
 * ponytail: no service interface - one implementation, and the whole thing is a lookup plus
 * a hash comparison. Split it out if login ever grows real logic (lockout, MFA, refresh).
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @PostMapping("/login")
    public Map<String, Object> login(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String password = body.get("password");
        if (email == null || email.isBlank() || password == null || password.isBlank()) {
            throw new ValidationException("email and password are required");
        }

        // Same error for "no such user" and "wrong password" - never reveal which.
        User user = userRepository.findByEmail(email)
                .filter(u -> passwordEncoder.matches(password, u.getPasswordHash()))
                .orElseThrow(() -> new ValidationException("Invalid email or password"));

        Map<String, Object> response = new HashMap<>();
        response.put("token", jwtService.issue(
                user.getId(), user.getEmail(), user.getRole(), user.getInstitutionId()));
        response.put("role", user.getRole().name());
        response.put("institutionId", user.getInstitutionId());
        return response;
    }
}
