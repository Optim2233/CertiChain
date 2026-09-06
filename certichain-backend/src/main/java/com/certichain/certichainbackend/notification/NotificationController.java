package com.certichain.certichainbackend.notification;

import com.certichain.certichainbackend.auth.CurrentUser;
import com.certichain.certichainbackend.common.entity.Notification;
import com.certichain.certichainbackend.common.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final CurrentUser currentUser;

    @GetMapping
    public Page<Notification> list(@RequestParam(defaultValue = "0") int page,
                                    @RequestParam(defaultValue = "20") int size) {
        return notificationService.list(currentUser.id(), page, size);
    }

    @GetMapping("/unread-count")
    public Map<String, Long> unreadCount() {
        return Map.of("unreadCount", notificationService.unreadCount(currentUser.id()));
    }

    @PatchMapping("/{id}/read")
    public void markRead(@PathVariable UUID id) {
        notificationService.markRead(currentUser.id(), id);
    }

    @PatchMapping("/read-all")
    public void markAllRead() {
        notificationService.markAllRead(currentUser.id());
    }
}
