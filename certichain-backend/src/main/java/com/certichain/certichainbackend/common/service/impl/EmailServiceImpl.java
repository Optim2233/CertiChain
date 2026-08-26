package com.certichain.certichainbackend.common.service.impl;

import com.certichain.certichainbackend.common.service.EmailService;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * Sends via Resend's HTTP API instead of raw SMTP. SMTP (ports 25/465/587) is routinely
 * blackholed by home routers/ISPs as an anti-spam-relay measure - confirmed on this project's
 * own dev network, where every SMTP port timed out but HTTPS worked instantly. An HTTP API
 * sidesteps that class of problem entirely, on any network this app is deployed to.
 */
@Slf4j
@Service
public class EmailServiceImpl implements EmailService {

    private static final URI RESEND_ENDPOINT = URI.create("https://api.resend.com/emails");
    private static final HttpClient HTTP_CLIENT = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final String apiKey;
    private final String fromAddress;
    private final boolean configured;

    public EmailServiceImpl(@Value("${resend.api-key:}") String apiKey,
                             @Value("${resend.from:CertiChain <onboarding@resend.dev>}") String fromAddress) {
        this.apiKey = apiKey;
        this.fromAddress = fromAddress;
        this.configured = apiKey != null && !apiKey.isBlank();
    }

    @PostConstruct
    void logConfigState() {
        if (!configured) {
            log.warn("RESEND_API_KEY is not set - email notifications are disabled (in-app notifications still work).");
        }
    }

    @Override
    public void send(String to, String subject, String body) {
        if (!configured) {
            return; // Nothing to call - skip rather than fail on every notify().
        }
        // A Resend hiccup notifying a graduate must never fail the credential action that
        // triggered it - log and move on, the in-app row already landed.
        try {
            String json = """
                    {"from":"%s","to":"%s","subject":"%s","text":"%s"}
                    """.formatted(jsonEscape(fromAddress), jsonEscape(to), jsonEscape(subject), jsonEscape(body));

            HttpRequest request = HttpRequest.newBuilder(RESEND_ENDPOINT)
                    .header("Authorization", "Bearer " + apiKey)
                    .header("Content-Type", "application/json")
                    .timeout(Duration.ofSeconds(10))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = HTTP_CLIENT.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300) {
                log.warn("Resend rejected email to {}: HTTP {} - {}", to, response.statusCode(), response.body());
            }
        } catch (Exception ex) {
            log.warn("Failed to send email to {}: {}", to, ex.getMessage());
        }
    }

    /** Minimal escaping for the handful of characters that would otherwise break this
     * hand-built JSON - a real library is overkill for two string fields. */
    private String jsonEscape(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
    }
}
