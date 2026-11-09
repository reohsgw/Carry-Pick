package com.carrypick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * How much the buyer pays (GUIDE step 3).
 *
 *   B = item budget (estimated price x quantity, or the request's max budget)
 *   R = traveler reward
 *   F = fee = feeRate x (B + R), rounded to the nearest won
 *   T = tax = always 0. Customs duty is the traveler's to declare at the airport, not charged by CarryPick.
 *   total = B + R + F + T
 *
 * The rates come from application.yml (app.pricing.*). The React app repeats this formula for live
 * previews, but the server's number is the one that is charged.
 */
@Service
public class PricingService {

    public record Quote(long budget, long reward, long fee, long tax, long total) {}

    private final double feeRate;

    /** The tax settings are still read so old config keeps working, but they no longer change the price. */
    public PricingService(@Value("${app.pricing.fee-rate}") double feeRate,
                          @Value("${app.pricing.tax-threshold-krw}") long taxThreshold,
                          @Value("${app.pricing.tax-rate}") double taxRate) {
        this.feeRate = feeRate;
    }

    public Quote quote(long budget, long reward) {
        long fee = feeOn(budget + reward);
        long tax = 0; // duty is the traveler's to declare at customs; not charged by CarryPick
        return new Quote(budget, reward, fee, tax, budget + reward + fee + tax);
    }

    /** Fee on any amount, e.g. the extra when a receipt is over budget. */
    public long feeOn(long amount) {
        return Math.round(feeRate * amount);
    }
}
