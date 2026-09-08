package com.certichain.certichainbackend.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Throttles /api/auth/login and /api/auth/signup per IP to slow down credential
 * stuffing / brute-force attempts against the public auth surface.
 *
 * ponytail: in-memory per-IP sliding window, resets on restart and doesn't share state
 * across instances - move to Redis/Bucket4j if this ever runs multi-instance.
 */
@Component
public class AuthRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MILLIS = 60_000;

    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        String uri = request.getRequestURI();
        if (!uri.equals("/api/auth/login") && !uri.equals("/api/auth/signup")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request);
        Instant now = Instant.now();
        // evict stale IPs to prevent unbounded growth
        hits.entrySet().removeIf(e -> {
            synchronized (e.getValue()) {
                while (!e.getValue().isEmpty() && e.getValue().peekFirst().isBefore(now.minusMillis(WINDOW_MILLIS * 2))) e.getValue().pollFirst();
                return e.getValue().isEmpty();
            }
        });
        Deque<Instant> window = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst().isBefore(now.minusMillis(WINDOW_MILLIS))) {
                window.pollFirst();
            }
            if (window.size() >= MAX_REQUESTS) {
                response.setStatus(429);
                response.getWriter().write("Too many attempts - try again shortly.");
                return;
            }
            window.addLast(now);
        }
        filterChain.doFilter(request, response);
    }

    private static String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return request.getRemoteAddr();
    }
}
