package com.certichain.certichainbackend.common.service;

public interface EmailService {
    void send(String to, String subject, String body);

    /**
     * Notification email (Thymeleaf template) with an explicit CTA. Relative ctaUrls
     * ("/graduate/credentials/{id}") are prefixed with the public email base URL.
     * Null CTA falls back to the legacy subject heuristic - only institution-status
     * emails still arrive that way.
     */
    void sendNotification(String to, String type, String message, String ctaUrl, String ctaLabel);
}
