package com.carrypick.repo;

import com.carrypick.domain.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findByOrderIdOrderByCreatedAtAscIdAsc(Long orderId);

    /** Messages from the other person that arrived after the viewer last opened the chat. */
    long countByOrderIdAndSenderIdNotAndCreatedAtAfter(Long orderId, Long viewerId, Instant after);

    long countByOrderIdAndSenderIdNot(Long orderId, Long viewerId);
}
