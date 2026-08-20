package com.certichain.certichainbackend.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "credential_field",
        uniqueConstraints = @UniqueConstraint(
                name = "uq_credential_field_credential_id_field_name",
                columnNames = {"credential_id", "field_name"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CredentialField {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "credential_id", nullable = false)
    private UUID credentialId;

    @Column(name = "field_name", nullable = false)
    private String fieldName;

    @Column(name = "field_value", columnDefinition = "text", nullable = false)
    private String fieldValue;

    @Column(name = "merkle_index", nullable = false)
    private int merkleIndex;
}
