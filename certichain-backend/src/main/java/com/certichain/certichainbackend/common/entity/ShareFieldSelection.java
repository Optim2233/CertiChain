package com.certichain.certichainbackend.common.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "share_field_selection")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ShareFieldSelection {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "share_id", nullable = false)
    private UUID shareId;

    @Column(name = "credential_field_id", nullable = false)
    private UUID credentialFieldId;
}
