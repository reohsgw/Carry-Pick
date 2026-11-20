package com.carrypick.web;

import com.carrypick.service.ExchangeRateService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CountryController {
    private final ExchangeRateService fx;

    public CountryController(ExchangeRateService fx) {
        this.fx = fx;
    }

    @GetMapping("/api/fx")
    public ExchangeRateService.Rates rates() {
        return fx.rates();
    }
}
