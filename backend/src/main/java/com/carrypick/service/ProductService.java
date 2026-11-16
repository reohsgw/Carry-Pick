package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.domain.Product;
import com.carrypick.domain.ProductNames;
import com.carrypick.repo.ProductRepository;
import com.carrypick.web.dto.Dtos.ProductDto;
import com.carrypick.web.dto.Forms.ProductForm;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class ProductService {
    private final ProductRepository products;

    public ProductService(ProductRepository products) {
        this.products = products;
    }

    @Transactional(readOnly = true)
    public Product get(Long id) {
        return products.findById(id).orElseThrow(() -> ApiException.notFound("Product"));
    }

    @Transactional(readOnly = true)
    public List<ProductDto> search(String q, String country, int limit) {
        return find(q, country, Math.max(1, Math.min(limit, 20))).stream().map(ProductDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<Long> matchingIds(String q) {
        String key = ProductNames.normalize(q);
        if (key.isEmpty()) return List.of();
        return products.findByKeyContaining(key, PageRequest.of(0, 200)).stream().map(Product::getId).toList();
    }

    List<Product> find(String q, String country, int limit) {
        String key = ProductNames.normalize(q);
        if (key.isEmpty()) return List.of();
        String c = country == null ? null : country.toUpperCase(Locale.ROOT);
        return products.findByKeyContaining(key, PageRequest.of(0, 200)).stream()
                .sorted(Comparator
                        .comparing((Product p) -> !p.getSearchKey().contains("|" + key + "|"))
                        .thenComparing(p -> !p.getSearchKey().contains("|" + key))
                        .thenComparing(p -> c == null || !c.equals(p.getCountryCode())))
                .limit(limit)
                .toList();
    }

    @Transactional
    public Product resolve(Long productId, String name, String category, String countryCode) {
        if (productId != null) {
            return products.findById(productId).orElseThrow(() -> ApiException.notFound("Product"));
        }
        Product same = exact(name, countryCode);
        if (same != null) return same;
        return products.save(new Product(name.trim(), null, null, null, category, countryCode));
    }

    @Transactional
    public ProductDto create(ProductForm f) {
        String country = f.countryCode() == null || f.countryCode().isBlank() ? null : f.countryCode().toUpperCase(Locale.ROOT);
        for (String n : new String[]{f.name(), f.nameKo(), f.nameLocal()}) {
            Product same = exact(n, country);
            if (same != null) return ProductDto.of(same);
        }
        Product p = products.save(new Product(f.name().trim(), blank(f.nameKo()), blank(f.nameLocal()),
                blank(f.aliases()), blank(f.category()), country));
        return ProductDto.of(p);
    }

    Product exact(String name, String countryCode) {
        String key = ProductNames.normalize(name);
        if (key.isEmpty()) return null;
        List<Product> hits = products.findByExactKey(key);
        return hits.stream().filter(p -> countryCode != null && countryCode.equalsIgnoreCase(p.getCountryCode()))
                .findFirst().orElse(hits.isEmpty() ? null : hits.get(0));
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
