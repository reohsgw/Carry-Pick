package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "stored_files")
public class StoredFile {
    @Id
    @Column(length = 64)
    private String name;

    @Column(nullable = false, length = 64)
    private String contentType;

    @Basic(fetch = FetchType.LAZY)
    @Column(nullable = false, columnDefinition = "bytea")
    private byte[] data;

    private Instant createdAt = Instant.now();

    protected StoredFile() {}

    public StoredFile(String name, String contentType, byte[] data) {
        this.name = name;
        this.contentType = contentType;
        this.data = data;
    }

    public String getName() { return name; }
    public String getContentType() { return contentType; }
    public byte[] getData() { return data; }
}
