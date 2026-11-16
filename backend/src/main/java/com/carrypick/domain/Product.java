package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "products")
public class Product {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 120)
    private String nameKo;

    @Column(length = 120)
    private String nameLocal;

    @Column(length = 1000)
    private String aliases;

    @Column(length = 40)
    private String category;

    @Column(length = 3)
    private String countryCode;

    @Column(nullable = false, length = 3000)
    private String searchKey = "||";

    private Instant createdAt = Instant.now();

    protected Product() {}

    public Product(String name, String nameKo, String nameLocal, String aliases, String category, String countryCode) {
        this.name = name;
        this.nameKo = nameKo;
        this.nameLocal = nameLocal;
        this.aliases = aliases;
        this.category = category;
        this.countryCode = countryCode;
        refreshSearchKey();
    }

    public List<String> terms() {
        List<String> out = new ArrayList<>();
        for (String s : new String[]{name, nameKo, nameLocal}) if (s != null && !s.isBlank()) out.add(s);
        if (aliases != null) {
            for (String a : aliases.split("[,\\n]")) if (!a.isBlank()) out.add(a.trim());
        }
        return out;
    }

    public void refreshSearchKey() {
        Set<String> keys = new LinkedHashSet<>();
        for (String t : terms()) {
            String k = ProductNames.normalize(t);
            if (!k.isEmpty()) keys.add(k);
        }
        searchKey = "|" + String.join("|", keys) + "|";
    }

    public void addAliases(String more) {
        if (more == null || more.isBlank()) return;
        Set<String> have = new LinkedHashSet<>();
        if (aliases != null) for (String a : aliases.split(",")) if (!a.isBlank()) have.add(a.trim());
        for (String a : more.split(",")) if (!a.isBlank()) have.add(a.trim());
        aliases = String.join(", ", have);
        refreshSearchKey();
    }

    public Long getId() { return id; }
    public String getName() { return name; }
    public String getNameKo() { return nameKo; }
    public void setNameKo(String nameKo) { this.nameKo = nameKo; refreshSearchKey(); }
    public String getNameLocal() { return nameLocal; }
    public void setNameLocal(String nameLocal) { this.nameLocal = nameLocal; refreshSearchKey(); }
    public String getAliases() { return aliases; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getCountryCode() { return countryCode; }
    public String getSearchKey() { return searchKey; }
    public Instant getCreatedAt() { return createdAt; }
}
