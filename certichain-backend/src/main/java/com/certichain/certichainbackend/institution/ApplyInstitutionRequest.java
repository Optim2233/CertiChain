package com.certichain.certichainbackend.institution;

import lombok.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class ApplyInstitutionRequest {
    // common
    String name;
    String institutionNameMm;
    String institutionType; // public | private
    String institutionCategory;
    String email;
    String password;
    String phone;
    String website;
    // address
    String stateRegion; String district; String township; String ward; String street; String postalCode;
    // public
    String governingMinistry; // maps from ministry param for backward compat
    Integer yearEstablished;
    String establishmentDocType; String establishmentDocTitle; String establishmentDocRef;
    String establishmentDocIssueDate; // YYYY-MM-DD
    // private business
    String companyName; String dicaCertificateNumber; String mycoRegistrationNumber;
    String tinNumber; String incorporationDate; String ownershipStructure;
    Long investmentAmount; Boolean foreignInvolvement; String micPermitNumber;
    // JSON strings for founders/administrator (validated in service)
    String foundersJson; // "[]"
    String administratorJson; // "{}" or null

    // files (Supabase)
    MultipartFile establishmentDocFile;
    MultipartFile dicaCertificate;
    MultipartFile taxClearance;
    MultipartFile micPermit;
    // legacy generic docs fallback
    List<MultipartFile> documents;
}
