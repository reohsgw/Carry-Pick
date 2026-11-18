package com.carrypick.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class PricingService {

    public record Quote(long budget, long reward, long fee, long tax, long total) {}

    private final double feeRate;
    private final double maxRewardRate;

    public PricingService(@Value("${app.pricing.fee-rate}") double feeRate,
                          @Value("${app.pricing.tax-threshold-krw}") long taxThreshold,
                          @Value("${app.pricing.tax-rate}") double taxRate,
                          @Value("${app.pricing.max-reward-rate:0.5}") double maxRewardRate) {
        this.feeRate = feeRate;
        this.maxRewardRate = maxRewardRate;
    }

    /** Highest reward allowed for an item at this price (rounded down to the won). */
    public long maxReward(long itemPrice) {
        return (long) Math.floor(itemPrice * maxRewardRate);
    }

    public void checkReward(long itemPrice, long reward) {
        if (reward > maxReward(itemPrice)) {
            throw com.carrypick.common.ApiException.badRequest("REWARD_TOO_HIGH",
                    "Reward can be at most " + Math.round(maxRewardRate * 100) + "% of the item price");
        }
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
