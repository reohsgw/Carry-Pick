package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;

/** An uploaded image or PDF, kept in the database so it survives redeploys of the server. */
@Entity
@Table(name = "stored_files")
public class StoredFile {
    /** File name as used in the public URL, e.g. "3f2c….jpg". */
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
