package com.certichain.certichainbackend.verifier;

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
 * Throttles the public, unauthenticated /api/verify/** surface. shareToken and credentialId
 * are both random UUIDs (infeasible to guess one-shot), but nothing else stops sustained
 * automated probing at volume - this closes that gap.
 *
 * ponytail: in-memory per-IP sliding window, resets on restart and doesn't share state across
 * instances - move to Redis/Bucket4j if this ever runs multi-instance.
 */
@Component
public class VerifyRateLimitFilter extends OncePerRequestFilter {

    private static final int MAX_REQUESTS = 30;
    private static final long WINDOW_MILLIS = 60_000;

    private final ConcurrentHashMap<String, Deque<Instant>> hits = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {
        if (!request.getRequestURI().startsWith("/api/verify/")) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = request.getRemoteAddr();
        Instant now = Instant.now();
        Deque<Instant> window = hits.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (window) {
            while (!window.isEmpty() && window.peekFirst().isBefore(now.minusMillis(WINDOW_MILLIS))) {
                window.pollFirst();
            }
            if (window.size() >= MAX_REQUESTS) {
                response.setStatus(429);
                response.getWriter().write("Too many verification requests - try again shortly.");
                return;
            }
            window.addLast(now);
        }
        filterChain.doFilter(request, response);
    }
}
