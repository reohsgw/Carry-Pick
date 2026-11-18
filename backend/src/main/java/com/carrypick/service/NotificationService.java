package com.carrypick.service;

import com.carrypick.domain.Notification;
import com.carrypick.domain.User;
import com.carrypick.repo.NotificationRepository;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    public enum Kind {
        BOOKED, REQUEST_ACCEPTED, PAID, PURCHASED, OVER_BUDGET, DELIVERED, REJECTED, SETTLED, CANCELLED, EXTRA_PAID, MESSAGE,
        REPORTED, RESOLVED, AUTO_CONFIRMED
    }

    private final NotificationRepository repo;

    public NotificationService(NotificationRepository repo) {
        this.repo = repo;
    }

    public void notify(User user, Long orderId, Kind kind, String actorName, String productName, Long amount,
                       String fallbackMessage) {
        repo.save(new Notification(user, orderId, kind.name(), actorName, productName, amount, fallbackMessage));
    }
}
