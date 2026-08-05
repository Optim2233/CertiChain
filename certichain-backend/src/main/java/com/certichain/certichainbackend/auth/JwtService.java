package com.certichain.certichainbackend.auth;

import com.certichain.certichainbackend.common.enums.Role;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private static final Duration EXPIRY = Duration.ofHours(12);
    // ponytail: fixed 12h expiry, add refresh tokens if session length ever becomes a complaint

    public JwtService(@Value("${certichain.jwt.secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    public String issue(UUID userId, String email, Role role, UUID institutionId) {
        var builder = Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role.name())
                .expiration(Date.from(Instant.now().plus(EXPIRY)));
        if (institutionId != null) {
            builder.claim("institutionId", institutionId.toString());
        }
        return builder.signWith(key).compact();
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }
}
