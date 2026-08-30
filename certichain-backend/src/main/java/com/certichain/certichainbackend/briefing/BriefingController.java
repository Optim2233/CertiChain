package com.certichain.certichainbackend.briefing;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/briefing")
@RequiredArgsConstructor
public class BriefingController {

    private final BriefingService briefingService;

    @GetMapping
    public Briefing get() {
        return briefingService.getBriefing();
    }

    @PostMapping("/ack")
    public void ack() {
        briefingService.acknowledge();
    }
}
