package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String passwordHash;

    @Column(nullable = false)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Mode mode = Mode.BUYER;

    private boolean test;

    private String avatarUrl;

    private Instant createdAt = Instant.now();

    protected User() {}

    public User(String email, String passwordHash, String name, Mode mode, boolean test) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.name = name;
        this.mode = mode;
        this.test = test;
    }

    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Mode getMode() { return mode; }
    public void setMode(Mode mode) { this.mode = mode; }
    public boolean isTest() { return test; }
    public String getAvatarUrl() { return avatarUrl; }
    public void setAvatarUrl(String avatarUrl) { this.avatarUrl = avatarUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
