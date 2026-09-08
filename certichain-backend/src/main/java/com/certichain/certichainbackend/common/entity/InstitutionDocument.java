package com.certichain.certichainbackend.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "institution_document")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InstitutionDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "institution_id", nullable = false)
    private UUID institutionId;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    // No @Lob: on Postgres it makes Hibernate write a large-object OID (bigint) instead of
    // inline bytea, which the bytea column rejects outright.
    @Column(name = "file_data", columnDefinition = "bytea")
    private byte[] fileData;

    @Column(name = "file_url", columnDefinition = "text")
    private String fileUrl;

    @Column(nullable = false)
    @Builder.Default
    private boolean verified = false;

    @Column(name = "uploaded_at", nullable = false)
    private Instant uploadedAt;
}
