package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private User sender;

    @Column(length = 1000)
    private String text;

    private String imageUrl;

    private Instant createdAt = Instant.now();

    protected ChatMessage() {}

    public ChatMessage(Order order, User sender, String text, String imageUrl) {
        this.order = order;
        this.sender = sender;
        this.text = text;
        this.imageUrl = imageUrl;
    }

    public Long getId() { return id; }
    public Order getOrder() { return order; }
    public User getSender() { return sender; }
    public String getText() { return text; }
    public String getImageUrl() { return imageUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
