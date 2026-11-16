package com.carrypick.web;

import com.carrypick.domain.Countries;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CountryController {
    @GetMapping("/api/countries")
    public List<Countries.Country> countries() {
        return Countries.ALL;
    }
}
