package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.entity.AuditLogEntry;
import com.certichain.certichainbackend.common.repository.AuditLogEntryRepository;
import com.certichain.certichainbackend.common.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogEntryRepository auditLogEntryRepository;

    @Override
    public void log(String event, UUID actorUserId, UUID institutionId, UUID credentialId) {
        log(event, actorUserId, institutionId, credentialId, null);
    }

    @Override
    public void log(String event, UUID actorUserId, UUID institutionId, UUID credentialId, UUID shareId) {
        auditLogEntryRepository.save(AuditLogEntry.builder()
                .event(event)
                .actorUserId(actorUserId)
                .institutionId(institutionId)
                .credentialId(credentialId)
                .shareId(shareId)
                .occurredAt(Instant.now())
                .build());
    }
}
