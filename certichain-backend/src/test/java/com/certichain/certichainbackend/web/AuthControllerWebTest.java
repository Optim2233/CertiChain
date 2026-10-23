package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.auth.AuthController;
import com.certichain.certichainbackend.auth.AuthService;
import com.certichain.certichainbackend.auth.JwtService;
import com.certichain.certichainbackend.common.enums.Role;
import com.certichain.certichainbackend.common.exception.ValidationException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@Import(WebSecuritySlice.class)
class AuthControllerWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    AuthService authService;

    // AuthController takes its own JwtService dep - the slice's mock covers @WebMvcTest's
    // component scan, but the controller constructor needs one injected explicitly here.
    @MockitoBean
    JwtService jwtService;

    private final UUID userId = UUID.randomUUID();

    @Test
    void loginIsPublicAndSetsJwtCookie() throws Exception {
        when(authService.authenticate("a@x.com", "pw"))
                .thenReturn(new AuthService.AuthResult(userId, "a@x.com", Role.GRADUATE, null));
        when(authService.findByUserId(userId))
                .thenReturn(new AuthService.UserResponse(userId, "a@x.com", Role.GRADUATE, null, null, null, null));
        when(jwtService.issue(any(), anyString(), any(), any())).thenReturn("token123");

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@x.com\",\"password\":\"pw\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@x.com"))
                .andExpect(cookie().value("jwt", "token123"));
    }

    @Test
    void loginWithBadCredentialsIs400() throws Exception {
        when(authService.authenticate(anyString(), anyString()))
                .thenThrow(new ValidationException("Invalid email or password"));

        mvc.perform(post("/api/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"a@x.com\",\"password\":\"bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        // Anonymous -> 401 so the frontend session-expiry interceptor fires (findings #3).
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void meReturnsCurrentUserWhenAuthenticated() throws Exception {
        when(authService.findByUserId(userId))
                .thenReturn(new AuthService.UserResponse(userId, "a@x.com", Role.GRADUATE, null, "Ada", "Lovelace", null));

        mvc.perform(get("/api/auth/me").with(user(userId.toString()).roles("GRADUATE")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("a@x.com"));
    }

    @Test
    void forgotPasswordIsPublicAndAlwaysGeneric() throws Exception {
        mvc.perform(post("/api/auth/forgot-password").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"whoever@x.com\"}"))
                .andExpect(status().isOk());
    }
}
