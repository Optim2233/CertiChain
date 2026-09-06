package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.graduate.GraduateController;
import com.certichain.certichainbackend.graduate.GraduateService;
import com.certichain.certichainbackend.notification.NotificationController;
import com.certichain.certichainbackend.common.service.NotificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest({GraduateController.class, NotificationController.class})
@Import(WebSecuritySlice.class)
class GraduateAndNotificationWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    GraduateService graduateService;

    @MockitoBean
    NotificationService notificationService;

    @MockitoBean
    CurrentUser currentUser;

    private final UUID meId = UUID.randomUUID();
    private final String uid = meId.toString();

    // --- graduate ---

    @Test
    void timelineRequiresGraduateRole() throws Exception {
        mvc.perform(get("/api/graduate/timeline")).andExpect(status().isForbidden());
        mvc.perform(get("/api/graduate/timeline").with(user(uid).roles("INSTITUTION")))
                .andExpect(status().isForbidden());
    }

    @Test
    void timelineOkForGraduate() throws Exception {
        when(graduateService.getTimeline()).thenReturn(List.of());
        mvc.perform(get("/api/graduate/timeline").with(user(uid).roles("GRADUATE")))
                .andExpect(status().isOk());
    }

    @Test
    void signupCheckIsPublic() throws Exception {
        when(graduateService.checkPendingCredentials("a@x.com")).thenReturn(2);
        mvc.perform(post("/api/graduate/signup/check").with(csrf())
                        .contentType("application/json").content("{\"email\":\"a@x.com\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void flagCredentialRoutesReasonThrough() throws Exception {
        UUID credId = UUID.randomUUID();
        mvc.perform(post("/api/graduate/credentials/{id}/flag", credId)
                        .with(user(uid).roles("GRADUATE")).with(csrf())
                        .contentType("application/json").content("{\"reason\":\"Wrong GPA\"}"))
                .andExpect(status().isOk());
        verify(graduateService).flagCredential(credId, "Wrong GPA");
    }

    // --- notifications ---

    @Test
    void notificationsRequireAuthentication() throws Exception {
        mvc.perform(get("/api/notifications")).andExpect(status().isForbidden());
    }

    @Test
    void notificationsListedForAnyAuthenticatedRole() throws Exception {
        when(currentUser.id()).thenReturn(meId);
        when(notificationService.list(eq(meId), anyInt(), anyInt()))
                .thenReturn(new PageImpl<>(List.of()));

        mvc.perform(get("/api/notifications").with(user(uid).roles("INSTITUTION")))
                .andExpect(status().isOk());
    }

    @Test
    void markAllReadIsScopedToCurrentUser() throws Exception {
        when(currentUser.id()).thenReturn(meId);
        mvc.perform(patch("/api/notifications/read-all").with(user(uid).roles("GRADUATE")).with(csrf()))
                .andExpect(status().isOk());
        verify(notificationService).markAllRead(meId);
    }
}
