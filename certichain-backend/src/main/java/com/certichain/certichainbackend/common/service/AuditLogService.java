package com.certichain.certichainbackend.common.service;

import java.util.UUID;

public interface AuditLogService {
    void log(String event, UUID actorUserId, UUID institutionId, UUID credentialId);

    void log(String event, UUID actorUserId, UUID institutionId, UUID credentialId, UUID shareId);
}
