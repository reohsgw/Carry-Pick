package com.carrypick.service;

import com.carrypick.service.PricingService.Quote;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PricingServiceTest {
    private final PricingService pricing = new PricingService(0.10, 150_000, 0.10);

    @Test
    void smallItemHasNoTax() {
        Quote q = pricing.quote(12_000, 4_000);
        assertEquals(1_600, q.fee());
        assertEquals(0, q.tax());
        assertEquals(17_600, q.total());
    }

    @Test
    void expensiveItemHasNoTaxEither() {
        Quote q = pricing.quote(260_000, 20_000);
        assertEquals(28_000, q.fee());
        assertEquals(0, q.tax());
        assertEquals(308_000, q.total());
    }

    @Test
    void feeIsRoundedToWholeWon() {
        assertEquals(1_235, pricing.quote(12_345, 0).fee());
    }
}
