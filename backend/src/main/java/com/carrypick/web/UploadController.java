package com.carrypick.web;

import com.carrypick.service.FileStorageService;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.time.Duration;

/** Serves uploaded files at /uploads/{name}. Names are random UUIDs, so the content never changes. */
@RestController
public class UploadController {
    private final FileStorageService files;

    public UploadController(FileStorageService files) {
        this.files = files;
    }

    @GetMapping("/uploads/{name:[A-Za-z0-9._-]+}")
    public ResponseEntity<byte[]> get(@PathVariable String name) {
        return files.load(name)
                .map(f -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(f.contentType()))
                        .cacheControl(CacheControl.maxAge(Duration.ofDays(365)).cachePublic().immutable())
                        .body(f.data()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
