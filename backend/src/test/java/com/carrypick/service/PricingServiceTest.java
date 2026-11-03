package com.carrypick.service;

import com.carrypick.service.PricingService.Quote;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * These tests describe the pricing rule. They FAIL until you finish PricingService (GUIDE step 3).
 * Run them with:  mvn test -Dtest=PricingServiceTest
 * No Spring, no database: just plain Java, so they run in about a second.
 */
class PricingServiceTest {
    private final PricingService pricing = new PricingService(0.10, 150_000, 0.10);

    @Test
    void smallItemHasNoTax() {
        Quote q = pricing.quote(12_000, 4_000);
        assertEquals(1_600, q.fee());   // 10% of 16,000
        assertEquals(0, q.tax());       // 12,000 is under the 150,000 threshold
        assertEquals(17_600, q.total());
    }

    @Test
    void expensiveItemGetsEstimatedTax() {
        Quote q = pricing.quote(260_000, 20_000);
        assertEquals(28_000, q.fee());
        assertEquals(26_000, q.tax());  // 10% of 260,000
        assertEquals(334_000, q.total());
    }

    @Test
    void exactlyAtThresholdIsNotTaxed() {
        assertEquals(0, pricing.quote(150_000, 0).tax());
    }

    @Test
    void feeIsRoundedToWholeWon() {
        assertEquals(1_235, pricing.quote(12_345, 0).fee()); // 1,234.5 rounds up
    }
}
