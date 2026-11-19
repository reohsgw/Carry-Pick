package com.carrypick.web;

import com.carrypick.domain.Countries;
import com.carrypick.service.ExchangeRateService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
public class CountryController {
    private final ExchangeRateService fx;

    public CountryController(ExchangeRateService fx) {
        this.fx = fx;
    }

    @GetMapping("/api/countries")
    public List<Countries.Country> countries() {
        return Countries.ALL;
    }

    /** Won per one unit of each currency, e.g. {"JPY": 9.21}. live is false when the fixed fallback rates are used. */
    @GetMapping("/api/fx")
    public ExchangeRateService.Rates rates() {
        return fx.rates();
    }
}
