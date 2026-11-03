package com.carrypick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * How much the buyer pays (GUIDE step 3).
 *
 *   B = item budget (estimated price x quantity, or the request's max budget)
 *   R = traveler reward
 *   F = fee = feeRate x (B + R), rounded to the nearest won
 *   T = tax = taxRate x B, but only if B > taxThreshold, otherwise 0 (rounded)
 *   total = B + R + F + T
 *
 * The rates come from application.yml (app.pricing.*). The React app repeats this formula for live
 * previews, but the server's number is the one that is charged.
 */
@Service
public class PricingService {

    public record Quote(long budget, long reward, long fee, long tax, long total) {}

    private final double feeRate;
    private final long taxThreshold;
    private final double taxRate;

    public PricingService(@Value("${app.pricing.fee-rate}") double feeRate,
                          @Value("${app.pricing.tax-threshold-krw}") long taxThreshold,
                          @Value("${app.pricing.tax-rate}") double taxRate) {
        this.feeRate = feeRate;
        this.taxThreshold = taxThreshold;
        this.taxRate = taxRate;
    }

    public Quote quote(long budget, long reward) {
        long fee = feeOn(budget + reward);
        long tax = budget > taxThreshold ? Math.round(taxRate * budget) : 0;
        return new Quote(budget, reward, fee, tax, budget + reward + fee + tax);
    }

    /** Fee on any amount, e.g. the extra when a receipt is over budget. */
    public long feeOn(long amount) {
        return Math.round(feeRate * amount);
    }
}
