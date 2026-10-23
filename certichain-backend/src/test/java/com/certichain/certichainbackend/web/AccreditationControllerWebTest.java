package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.accreditation.AccreditationController;
import com.certichain.certichainbackend.accreditation.AccreditationService;
import com.certichain.certichainbackend.common.exception.ForbiddenActionException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AccreditationController.class)
@Import(WebSecuritySlice.class)
class AccreditationControllerWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    AccreditationService accreditationService;

    private final String uid = UUID.randomUUID().toString();

    @Test
    void everyEndpointRequiresAaRole() throws Exception {
        // Unauthenticated is 401; the two wrong-role cases below stay 403.
        mvc.perform(get("/api/aa/institutions")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/aa/institutions").with(user(uid).roles("INSTITUTION")))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/aa/institutions").with(user(uid).roles("GRADUATE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void listInstitutionsOkForAa() throws Exception {
        when(accreditationService.listInstitutions(any(), any(), eq(0), eq(20)))
                .thenReturn(new PageImpl<>(List.of()));
        mvc.perform(get("/api/aa/institutions").with(user(uid).roles("ACCREDITATION_AUTHORITY")))
                .andExpect(status().isOk());
    }

    @Test
    void approveRoutesToService() throws Exception {
        UUID id = UUID.randomUUID();
        mvc.perform(post("/api/aa/institutions/{id}/approve", id)
                        .with(user(uid).roles("ACCREDITATION_AUTHORITY")).with(csrf()))
                .andExpect(status().isOk());
        verify(accreditationService).approve(id);
    }

    @Test
    void suspendBubblesServiceValidationErrorAsBadRequest() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new com.certichain.certichainbackend.common.exception.ValidationException("reason is required"))
                .when(accreditationService).suspend(eq(id), any());

        mvc.perform(post("/api/aa/institutions/{id}/suspend", id)
                        .with(user(uid).roles("ACCREDITATION_AUTHORITY")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void terminalRevokedTransitionSurfacesAsForbidden() throws Exception {
        UUID id = UUID.randomUUID();
        doThrow(new ForbiddenActionException("Institution is revoked - terminal"))
                .when(accreditationService).approve(id);

        mvc.perform(post("/api/aa/institutions/{id}/approve", id)
                        .with(user(uid).roles("ACCREDITATION_AUTHORITY")).with(csrf()))
                .andExpect(status().isForbidden());
    }
}
