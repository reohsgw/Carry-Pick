package com.carrypick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PricingService {

    public record Quote(long budget, long reward, long fee, long tax, long total) {}

    private final double feeRate;

    public PricingService(@Value("${app.pricing.fee-rate}") double feeRate,
                          @Value("${app.pricing.tax-threshold-krw}") long taxThreshold,
                          @Value("${app.pricing.tax-rate}") double taxRate) {
        this.feeRate = feeRate;
    }

    public Quote quote(long budget, long reward) {
        long fee = feeOn(budget + reward);
        long tax = 0;
        return new Quote(budget, reward, fee, tax, budget + reward + fee + tax);
    }

    public long feeOn(long amount) {
        return Math.round(feeRate * amount);
    }
}
