package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.common.entity.Institution;
import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.certichain.certichainbackend.institution.BatchRevokeResult;
import com.certichain.certichainbackend.institution.InstitutionController;
import com.certichain.certichainbackend.institution.InstitutionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(InstitutionController.class)
@Import(WebSecuritySlice.class)
class InstitutionControllerWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    InstitutionService institutionService;

    private final String uid = UUID.randomUUID().toString();

    private Institution inst() {
        return Institution.builder().id(UUID.randomUUID()).name("UIT").ministry("MoST")
                .status(InstitutionStatus.APPROVED).appliedAt(Instant.now()).build();
    }

    @Test
    void meRequiresAuthentication() throws Exception {
        mvc.perform(get("/api/institution/me")).andExpect(status().isForbidden());
    }

    @Test
    void meForbiddenForWrongRole() throws Exception {
        mvc.perform(get("/api/institution/me").with(user(uid).roles("GRADUATE")))
                .andExpect(status().isForbidden());
    }

    @Test
    void meOkForInstitutionRole() throws Exception {
        when(institutionService.getOwnInstitution()).thenReturn(inst());
        mvc.perform(get("/api/institution/me").with(user(uid).roles("INSTITUTION")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("UIT"));
    }

    @Test
    void revokeBatchRoutesToServiceAndReturnsCounts() throws Exception {
        UUID batchId = UUID.randomUUID();
        when(institutionService.revokeBatch(eq(batchId), eq("policy"), eq(null)))
                .thenReturn(new BatchRevokeResult(3, 1));

        mvc.perform(post("/api/institution/credentials/batches/{id}/revoke", batchId)
                        .with(user(uid).roles("INSTITUTION")).with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"policy\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.revoked").value(3))
                .andExpect(jsonPath("$.alreadyRevoked").value(1));

        verify(institutionService).revokeBatch(batchId, "policy", null);
    }

    @Test
    void listBatchesRequiresInstitutionRole() throws Exception {
        mvc.perform(get("/api/institution/credentials/batches").with(user(uid).roles("ACCREDITATION_AUTHORITY")))
                .andExpect(status().isForbidden());
    }

    @Test
    void listBatchesOkForInstitution() throws Exception {
        when(institutionService.listBatches()).thenReturn(List.of());
        mvc.perform(get("/api/institution/credentials/batches").with(user(uid).roles("INSTITUTION")))
                .andExpect(status().isOk());
    }

    @Test
    void applyIsPublicMultipart() throws Exception {
        when(institutionService.apply(any())).thenReturn(inst());
        mvc.perform(post("/api/institution/apply").with(csrf())
                        .param("name", "UIT").param("ministry", "MoST")
                        .param("email", "a@x.com").param("password", "pw"))
                .andExpect(status().isOk());
    }
}
