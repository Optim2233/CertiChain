package com.certichain.certichainbackend.common.entity;

import com.certichain.certichainbackend.common.enums.InstitutionStatus;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "institution")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Institution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column
    private String ministry;

    @Column(name = "institution_type", length = 10)
    private String institutionType;

    @Column(name = "institution_name_mm")
    private String institutionNameMm;

    @Column(name = "institution_category", length = 20)
    private String institutionCategory;

    @Column(name = "state_region", length = 100)
    private String stateRegion;
    @Column(name = "district", length = 100)
    private String district;
    @Column(name = "township", length = 100)
    private String township;
    @Column(name = "ward", length = 100)
    private String ward;
    @Column(name = "street", columnDefinition = "text")
    private String street;
    @Column(name = "postal_code", length = 20)
    private String postalCode;

    // public-only
    @Column(name = "year_established")
    private Integer yearEstablished;
    @Column(name = "establishment_doc_type", length = 30)
    private String establishmentDocType;
    @Column(name = "establishment_doc_title", columnDefinition = "text")
    private String establishmentDocTitle;
    @Column(name = "establishment_doc_ref")
    private String establishmentDocRef;
    @Column(name = "establishment_doc_issue_date")
    private java.time.LocalDate establishmentDocIssueDate;
    @Column(name = "establishment_doc_url", columnDefinition = "text")
    private String establishmentDocUrl;

    // private-only business (ponytail: columns not JSONB — these are individually queryable/filterable)
    @Column(name = "company_name")
    private String companyName;
    @Column(name = "dica_certificate_number", length = 100)
    private String dicaCertificateNumber;
    @Column(name = "myco_registration_number", length = 100)
    private String mycoRegistrationNumber;
    @Column(name = "tin_number", length = 100)
    private String tinNumber;
    @Column(name = "incorporation_date")
    private java.time.LocalDate incorporationDate;
    @Column(name = "ownership_structure", length = 100)
    private String ownershipStructure;
    @Column(name = "investment_amount")
    private Long investmentAmount;
    @Column(name = "foreign_involvement", nullable = false)
    @Builder.Default
    private Boolean foreignInvolvement = false;
    @Column(name = "mic_permit_number", length = 100)
    private String micPermitNumber;
    @Column(name = "dica_certificate_url", columnDefinition = "text")
    private String dicaCertificateUrl;
    @Column(name = "tax_clearance_url", columnDefinition = "text")
    private String taxClearanceUrl;
    @Column(name = "mic_permit_url", columnDefinition = "text")
    private String micPermitUrl;

    // variable-shape -> JSONB (ponytail: avoids extra tables for write-once arrays/objects)
    @Column(name = "founders", columnDefinition = "jsonb")
    @Builder.Default
    private String founders = "[]";
    @Column(name = "administrator", columnDefinition = "jsonb")
    private String administrator;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private InstitutionStatus status;

    @Column(name = "status_reason")
    private String statusReason;

    @Column(name = "applied_at", nullable = false)
    private Instant appliedAt;

    @Column(name = "decided_at")
    private Instant decidedAt;

    /** Institution's signing public key. Null until the AA approves the institution. */
    @Column(name = "public_key", columnDefinition = "text")
    private String publicKey;

    /**
     * Encrypted private key — never stored as raw PKCS#8, and never
     * serialized out over HTTP either: every endpoint that returns
     * Institution directly (including the unauthenticated
     * /api/verify/institutions directory) would otherwise leak this to
     * whoever called it. Backend-internal use only (signing service).
     */
    @JsonIgnore
    @Column(name = "private_key_enc", columnDefinition = "text")
    private String privateKeyEnc;

    @Column(name = "key_algorithm", length = 20)
    private String keyAlgorithm;

    @Column(name = "key_generated_at")
    private Instant keyGeneratedAt;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "website")
    private String website;

    @Column(name = "profile_image_url", columnDefinition = "text")
    private String profileImageUrl;

    /** #RRGGBB card accent, null = deterministic per-name fallback on the frontend. */
    @Column(name = "brand_color", length = 7)
    private String brandColor;

    /** Card watermark style: hatch | dots | none. */
    @Column(name = "accent_pattern", length = 10, nullable = false)
    @Builder.Default
    private String accentPattern = "hatch";

    @Column(name = "secondary_brand_color", length = 7)
    private String secondaryBrandColor;
    @Column(name = "accent_color", length = 10)
    @Builder.Default
    private String accentColor = "light";
    @Column(name = "watermark_opacity")
    @Builder.Default
    private Integer watermarkOpacity = 8;
    @Column(name = "pattern_scale", length = 10)
    @Builder.Default
    private String patternScale = "md";
    @Column(name = "card_radius", length = 10)
    @Builder.Default
    private String cardRadius = "lg";
    @Column(name = "title_font", length = 10)
    @Builder.Default
    private String titleFont = "heading";
    @Column(name = "logo_shape", length = 10)
    @Builder.Default
    private String logoShape = "rounded";
    @Column(name = "medal_style", length = 10)
    @Builder.Default
    private String medalStyle = "seal";
    @Column(name = "medal_shape", length = 10)
    @Builder.Default
    private String medalShape = "rounded";
    @Column(name = "medal_position", length = 10)
    @Builder.Default
    private String medalPosition = "top-left";
    @Column(name = "medal_icon", length = 20)
    @Builder.Default
    private String medalIcon = "auto";
    @Column(name = "medal_size", length = 10)
    @Builder.Default
    private String medalSize = "lg";
    @Column(name = "watermark_icon", length = 20)
    @Builder.Default
    private String watermarkIcon = "workspace_premium";

    @Column(name = "updated_at")
    private Instant updatedAt;

    @Version
    @Column(nullable = false)
    @Builder.Default
    private long version = 0;

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}
