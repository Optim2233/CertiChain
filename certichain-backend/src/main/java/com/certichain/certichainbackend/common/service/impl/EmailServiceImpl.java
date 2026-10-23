package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.service.EmailService;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;
    private final String fromAddress;
    private final String emailBaseUrl;
    private final String logoUrl;
    private final boolean configured;

    public EmailServiceImpl(JavaMailSender mailSender, TemplateEngine templateEngine,
                            @Value("${spring.mail.username:}") String gmailAddress,
                            @Value("${mail.from:}") String fromAddress,
                            @Value("${certichain.frontend-url:http://localhost:3000}") String frontendUrl,
                            @Value("${certichain.email.base-url:${certichain.frontend-url:http://localhost:3000}}") String emailBaseUrlParam,
                            @Value("${certichain.email.logo-url:}") String logoUrl) {
        this.mailSender = mailSender;
        this.templateEngine = templateEngine;
        this.fromAddress = fromAddress != null && !fromAddress.isBlank() ? fromAddress : gmailAddress;
        // Logo + CTA links must be publicly reachable (a dev LAN frontend URL is not) -
        // EMAIL_PUBLIC_BASE_URL overrides them independently in prod.
        String emailBase = emailBaseUrlParam != null && !emailBaseUrlParam.isBlank() ? emailBaseUrlParam : frontendUrl;
        this.emailBaseUrl = emailBase;
        this.logoUrl = logoUrl != null && !logoUrl.isBlank() ? logoUrl : emailBase.replaceAll("/$","") + "/certichain-shield.svg";
        this.configured = gmailAddress != null && !gmailAddress.isBlank();
    }

    // Send outcomes, so a dead SMTP pipeline is visible in aggregate rather than as
    // one easily-missed WARN per message. Read by EmailHealthIndicator.
    private final java.util.concurrent.atomic.AtomicLong sent = new java.util.concurrent.atomic.AtomicLong();
    private final java.util.concurrent.atomic.AtomicLong failed = new java.util.concurrent.atomic.AtomicLong();
    private volatile String lastFailure;

    /** @return sent count, failed count, and the most recent failure message (null if none). */
    public EmailDeliveryStats deliveryStats() {
        return new EmailDeliveryStats(configured, sent.get(), failed.get(), lastFailure);
    }

    public record EmailDeliveryStats(boolean configured, long sent, long failed, String lastFailure) {}

    private void recordFailure(String to, Exception ex) {
        long n = failed.incrementAndGet();
        lastFailure = ex.getClass().getSimpleName() + ": " + ex.getMessage();
        // ERROR, not WARN: an undelivered password reset blocks the user entirely.
        log.error("Email delivery FAILED to {} ({} failures so far, {} delivered): {}",
                to, n, sent.get(), lastFailure);
    }

    @PostConstruct
    void logConfigState() {
        if (!configured) log.warn("GMAIL_ADDRESS is not set - email notifications are disabled (in-app notifications still work).");
        else log.info("Gmail SMTP configured, from={} logo={}", fromAddress, logoUrl);
    }

    @Override
    public void send(String to, String subject, String body) {
        sendInternal(to, subject, body, null, null);
    }

    // Async so the SMTP round-trip never blocks the API request that triggered
    // the email. Failures are already caught and logged inside each method.
    @Async
    public void sendPasswordReset(String to, String resetLink) {
        if (!configured) return;
        try {
            Context ctx = new Context();
            ctx.setVariable("frontendUrl", emailBaseUrl);
            ctx.setVariable("logoUrl", logoUrl);
            ctx.setVariable("preheader", "Reset your CertiChain password — expires in 30 minutes");
            ctx.setVariable("resetLink", resetLink);
            String html = templateEngine.process("email/password-reset", ctx);
            String text = "Reset your CertiChain password\n\nClick the link (expires in 30 minutes):\n" + resetLink + "\n\nIf you didn't request this, ignore this email.";
            sendMime(to, "Reset your CertiChain password", text, html);
            sent.incrementAndGet();
        } catch (Exception ex) {
            recordFailure(to, ex);
        }
    }

    @Async
    public void sendNotification(String to, String type, String message) {
        String ctaUrl = null; String ctaLabel = null;
        String lower = type != null ? type.toLowerCase() : "";
        if (lower.contains("issuing institution") || lower.contains("certificate")) { ctaUrl = emailBaseUrl + "/graduate"; ctaLabel = "View credentials"; }
        else if (lower.contains("approv") || lower.contains("reinstat")) { ctaUrl = emailBaseUrl + "/login"; ctaLabel = "Sign in"; }
        else if (lower.contains("reject") || lower.contains("information requested") || lower.contains("suspend") || lower.contains("revok")) { ctaUrl = emailBaseUrl + "/login"; ctaLabel = "Review application"; }
        sendInternal(to, "CertiChain: " + type, message, ctaUrl, ctaLabel);
    }

    private void sendInternal(String to, String subject, String body, String ctaUrl, String ctaLabel) {
        if (!configured) return;
        try {
            Context ctx = new Context();
            ctx.setVariable("frontendUrl", emailBaseUrl);
            ctx.setVariable("logoUrl", logoUrl);
            ctx.setVariable("preheader", subject);
            ctx.setVariable("title", subject);
            ctx.setVariable("message", body);
            ctx.setVariable("ctaUrl", ctaUrl);
            ctx.setVariable("ctaLabel", ctaLabel);
            String html = templateEngine.process("email/notification", ctx);
            sendMime(to, subject, body, html);
            sent.incrementAndGet();
        } catch (Exception ex) {
            recordFailure(to, ex);
        }
    }

    private void sendMime(String to, String subject, String text, String html) throws Exception {
        MimeMessage mime = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(mime, true, "UTF-8");
        helper.setFrom(fromAddress);
        helper.setTo(to);
        helper.setSubject(subject);
        helper.setText(text, html);
        mailSender.send(mime);
    }
}
