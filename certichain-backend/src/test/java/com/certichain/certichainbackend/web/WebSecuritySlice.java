package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.auth.AuthRateLimitFilter;
import com.certichain.certichainbackend.auth.JwtAuthenticationFilter;
import com.certichain.certichainbackend.auth.JwtService;
import com.certichain.certichainbackend.config.SecurityConfig;
import com.certichain.certichainbackend.verifier.VerifyRateLimitFilter;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

import static org.mockito.Mockito.mock;

/**
 * Shared wiring for @WebMvcTest slices: brings in the real SecurityConfig (so @PreAuthorize
 * and the permitAll matchers behave as in prod) plus the three filter beans it needs. The
 * JWT filter is inert in these tests - requests carry no cookie/header and authentication is
 * injected via SecurityMockMvcRequestPostProcessors.user(...) / @WithMockUser instead.
 */
@TestConfiguration
@Import(SecurityConfig.class)
public class WebSecuritySlice {

    @Bean
    JwtService jwtService() {
        return mock(JwtService.class);
    }

    @Bean
    JwtAuthenticationFilter jwtAuthenticationFilter(JwtService jwtService) {
        return new JwtAuthenticationFilter(jwtService);
    }

    @Bean
    VerifyRateLimitFilter verifyRateLimitFilter() {
        return new VerifyRateLimitFilter();
    }

    @Bean
    AuthRateLimitFilter authRateLimitFilter() {
        return new AuthRateLimitFilter();
    }
}
