package com.certichain.certichainbackend.web;

import com.certichain.certichainbackend.common.enums.VerificationResult;
import com.certichain.certichainbackend.verifier.VerificationResponse;
import com.certichain.certichainbackend.verifier.VerifierController;
import com.certichain.certichainbackend.verifier.VerifierService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** /api/verify/** is entirely permitAll - reachable with no authentication. */
@WebMvcTest(VerifierController.class)
@Import(WebSecuritySlice.class)
class VerifierControllerWebTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    VerifierService verifierService;

    private VerificationResponse verified() {
        return new VerificationResponse(VerificationResult.VERIFIED, "BSc", "a@x.com",
                "UIT", "APPROVED", null, null, null, null, List.of(), "sig",
                null, null, null, null, null, null, null, null, null, null, null, null, null, null);
    }

    @Test
    void verifyByIdIsPublic() throws Exception {
        UUID id = UUID.randomUUID();
        when(verifierService.verifyById(id)).thenReturn(verified());

        mvc.perform(get("/api/verify/certificate/{id}", id))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.result").value("VERIFIED"))
                .andExpect(jsonPath("$.institutionName").value("UIT"));
    }

    @Test
    void institutionsDirectoryIsPublic() throws Exception {
        when(verifierService.publicInstitutionDirectory()).thenReturn(List.of());
        mvc.perform(get("/api/verify/institutions")).andExpect(status().isOk());
    }

    @Test
    void malformedUuidPathIs400() throws Exception {
        mvc.perform(get("/api/verify/certificate/not-a-uuid"))
                .andExpect(status().isBadRequest());
    }
}
