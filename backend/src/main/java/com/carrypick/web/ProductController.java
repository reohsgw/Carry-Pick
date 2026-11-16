package com.carrypick.web;

import com.carrypick.service.ProductService;
import com.carrypick.web.dto.Dtos.ProductDto;
import com.carrypick.web.dto.Forms.ProductForm;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService products;

    public ProductController(ProductService products) {
        this.products = products;
    }

    @GetMapping
    public List<ProductDto> search(@RequestParam(defaultValue = "") String q,
                                   @RequestParam(required = false) String country,
                                   @RequestParam(defaultValue = "8") int limit) {
        return products.search(q, country, limit);
    }

    @PostMapping
    public ProductDto create(@Valid @RequestBody ProductForm form) {
        return products.create(form);
    }
}
