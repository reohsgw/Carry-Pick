package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.config.AppProperties;
import com.carrypick.domain.StoredFile;
import com.carrypick.repo.StoredFileRepository;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class FileStorageService {
    private static final Map<String, String> ALLOWED = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif",
            "application/pdf", ".pdf");

    private final Path root;
    private final StoredFileRepository repo;

    public FileStorageService(AppProperties props, StoredFileRepository repo) {
        this.root = Path.of(props.uploadDir()).toAbsolutePath();
        this.repo = repo;
    }

    @Transactional
    public String store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("FILE_REQUIRED", "Please attach a file");
        }
        String type = file.getContentType();
        String ext = ALLOWED.get(type);
        if (ext == null) {
            throw ApiException.badRequest("FILE_TYPE", "Only JPG, PNG, WEBP, GIF or PDF files are allowed");
        }
        String name = UUID.randomUUID() + ext;
        try {
            repo.save(new StoredFile(name, type, file.getBytes()));
        } catch (IOException e) {
            throw new IllegalStateException("Could not save file", e);
        }
        return "/uploads/" + name;
    }

    public record Loaded(String contentType, byte[] data) {}

    @Transactional(readOnly = true)
    public Optional<Loaded> load(String name) {
        Optional<Loaded> fromDb = repo.findById(name).map(f -> new Loaded(f.getContentType(), f.getData()));
        if (fromDb.isPresent()) return fromDb;
        Path p = root.resolve(name).normalize();
        if (!p.startsWith(root) || !Files.isRegularFile(p)) return Optional.empty();
        try {
            String type = Files.probeContentType(p);
            return Optional.of(new Loaded(type != null ? type : MediaType.APPLICATION_OCTET_STREAM_VALUE, Files.readAllBytes(p)));
        } catch (IOException e) {
            return Optional.empty();
        }
    }
}
