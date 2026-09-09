package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.CredentialField;
import com.certichain.certichainbackend.common.entity.DisputeFlag;
import com.certichain.certichainbackend.common.entity.Share;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/graduate")
@RequiredArgsConstructor
public class GraduateController {

    private final GraduateService graduateService;

    @PostMapping("/signup/check")
    public Map<String, Integer> signupCheck(@RequestBody Map<String, String> body) {
        return Map.of("pendingCredentialCount", graduateService.checkPendingCredentials(body.get("email")));
    }

    @PostMapping("/signup")
    public void signup(@RequestBody Map<String, String> body) {
        graduateService.signup(
                body.get("email"), body.get("password"),
                body.get("firstName"), body.get("lastName"), body.get("phone"));
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('GRADUATE')")
    public GraduateProfileResponse getProfile() {
        return graduateService.getOwnProfile();
    }

    @PutMapping(value = "/profile", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('GRADUATE')")
    public GraduateProfileResponse updateProfileMultipart(
            @RequestParam(required = false) String firstName,
            @RequestParam(required = false) String lastName,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String profileImageUrl,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage) {
        return graduateService.updateOwnProfile(firstName, lastName, phone, profileImageUrl, profileImage);
    }

    @PutMapping(value = "/profile", consumes = MediaType.APPLICATION_JSON_VALUE)
    @PreAuthorize("hasRole('GRADUATE')")
    public GraduateProfileResponse updateProfileJson(@RequestBody Map<String, String> body) {
        return graduateService.updateOwnProfile(body.get("firstName"), body.get("lastName"),
                body.get("phone"), body.get("profileImageUrl"), null);
    }

    @GetMapping("/timeline")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<CredentialListItem> timeline() {
        return graduateService.getTimeline();
    }

    @GetMapping("/credentials/{id}/fields")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<CredentialField> credentialFields(@PathVariable UUID id) {
        return graduateService.getCredentialFields(id);
    }

    @PostMapping("/shares")
    @PreAuthorize("hasRole('GRADUATE')")
    public Share createShare(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> selectedFieldIdStrings = (List<String>) body.get("selectedFieldIds");
        List<UUID> selectedFieldIds = selectedFieldIdStrings == null ? List.of()
                : selectedFieldIdStrings.stream().map(UUID::fromString).toList();
        String credentialIdStr = (String) body.get("credentialId");
        UUID credentialId = credentialIdStr == null ? null : UUID.fromString(credentialIdStr);
        return graduateService.createShare(
                (String) body.get("name"), (String) body.get("scope"), credentialId, selectedFieldIds);
    }

    @GetMapping("/shares")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<Share> listShares() {
        return graduateService.listShares();
    }

    @PostMapping("/shares/{id}/revoke")
    @PreAuthorize("hasRole('GRADUATE')")
    public void revokeShare(@PathVariable UUID id) {
        graduateService.revokeShare(id);
    }

    @PostMapping("/shares/{id}/unrevoke")
    @PreAuthorize("hasRole('GRADUATE')")
    public void unrevokeShare(@PathVariable UUID id) {
        graduateService.unrevokeShare(id);
    }

    @PostMapping("/shares/revoke-batch")
    @PreAuthorize("hasRole('GRADUATE')")
    public BatchShareRevokeResult revokeShares(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<String> rawIds = (List<String>) body.get("shareIds");
        List<UUID> shareIds = rawIds == null ? List.of() : rawIds.stream().map(UUID::fromString).toList();
        return graduateService.revokeShares(shareIds);
    }

    @GetMapping("/shares/{id}/activity")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<Instant> shareActivity(@PathVariable UUID id) {
        return graduateService.getShareActivity(id);
    }

    @PostMapping("/credentials/{id}/flag")
    @PreAuthorize("hasRole('GRADUATE')")
    public DisputeFlag flagCredential(@PathVariable UUID id, @RequestBody Map<String, String> body) {
        return graduateService.flagCredential(id, body.get("reason"));
    }

    @GetMapping("/credentials/{id}/flags")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<DisputeFlag> credentialFlags(@PathVariable UUID id) {
        return graduateService.getCredentialFlags(id);
    }

    @GetMapping("/disputes/count")
    @PreAuthorize("hasRole('GRADUATE')")
    public Map<String, Integer> pendingDisputeCount() {
        return Map.of("pendingDisputeCount", graduateService.countOpenDisputes());
    }

    @GetMapping("/disputes")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<DisputeFlag> openDisputes() {
        return graduateService.listOpenDisputes();
    }

    @GetMapping("/disputes/all")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<DisputeFlag> allDisputes() {
        return graduateService.listAllDisputes();
    }

    @PostMapping("/disputes/{id}/withdraw")
    @PreAuthorize("hasRole('GRADUATE')")
    public void withdrawDispute(@PathVariable UUID id) {
        graduateService.withdrawDispute(id);
    }

    @GetMapping("/verifications/count")
    @PreAuthorize("hasRole('GRADUATE')")
    public Map<String, Integer> verificationCount() {
        return Map.of("totalVerifications", graduateService.countVerifications());
    }

    @GetMapping("/credentials/{id}/verifications")
    @PreAuthorize("hasRole('GRADUATE')")
    public List<Instant> credentialVerificationHistory(@PathVariable UUID id) {
        return graduateService.getCredentialVerificationHistory(id);
    }
}
