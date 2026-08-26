package com.certichain.certichainbackend.common.service;

public interface EmailService {
    void send(String to, String subject, String body);
}
