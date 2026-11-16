package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.domain.ChatMessage;
import com.carrypick.domain.Order;
import com.carrypick.domain.User;
import com.carrypick.repo.ChatMessageRepository;
import com.carrypick.repo.NotificationRepository;
import com.carrypick.web.dto.Dtos.ChatMessageDto;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class ChatService {
    private final ChatMessageRepository messages;
    private final OrderService orders;
    private final AuthService auth;
    private final NotificationService notifications;
    private final NotificationRepository notificationRepo;

    public ChatService(ChatMessageRepository messages, OrderService orders, AuthService auth,
                       NotificationService notifications, NotificationRepository notificationRepo) {
        this.messages = messages;
        this.orders = orders;
        this.auth = auth;
        this.notifications = notifications;
        this.notificationRepo = notificationRepo;
    }

    @Transactional
    public List<ChatMessageDto> list(Long userId, Long orderId) {
        Order o = orders.findForParticipant(userId, orderId);
        markRead(o, userId);
        return messages.findByOrderIdOrderByCreatedAtAscIdAsc(orderId).stream()
                .map(m -> ChatMessageDto.of(m, userId)).toList();
    }

    @Transactional
    public ChatMessageDto send(Long userId, Long orderId, String text, String imageUrl) {
        Order o = orders.findForParticipant(userId, orderId);
        String body = text == null ? null : text.strip();
        if ((body == null || body.isEmpty()) && (imageUrl == null || imageUrl.isBlank())) {
            throw ApiException.badRequest("EMPTY_MESSAGE", "Write a message or attach a photo");
        }
        User me = auth.require(userId);
        ChatMessage m = messages.save(new ChatMessage(o, me, body == null || body.isEmpty() ? null : body,
                imageUrl == null || imageUrl.isBlank() ? null : imageUrl));
        markRead(o, userId);

        User other = o.isBuyer(userId) ? o.getTraveler() : o.getBuyer();
        boolean alreadyNotified = notificationRepo.existsByUserIdAndOrderIdAndKindAndReadFalse(
                other.getId(), o.getId(), NotificationService.Kind.MESSAGE.name());
        if (!alreadyNotified) {
            String preview = m.getText() == null ? "(photo)" : m.getText();
            if (preview.length() > 80) preview = preview.substring(0, 80) + "…";
            notifications.notify(other, o.getId(), NotificationService.Kind.MESSAGE, me.getName(), o.getProductName(),
                    null, me.getName() + " sent a message about " + o.getProductName() + ": " + preview);
        }
        return ChatMessageDto.of(m, userId);
    }

    private void markRead(Order o, Long userId) {
        if (o.isBuyer(userId)) o.setBuyerChatReadAt(Instant.now());
        else o.setTravelerChatReadAt(Instant.now());
    }
}
