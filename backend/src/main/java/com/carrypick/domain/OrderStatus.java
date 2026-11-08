package com.carrypick.domain;

/**
 * Where an order is in its life. This is the heart of the app - draw it on paper first!
 *
 *   PENDING_PAYMENT --pay ok--> PAID --traveler buys, receipt <= limit--> PURCHASED (unspent budget refunded at settlement)
 *        |  pay fails          |  \--offer was already bought: receipt attached at listing--> PURCHASED right after payment
 *        v                     \--shelf price > budget: price-tag photo--> AWAITING_APPROVAL (before buying)
 *   PAYMENT_FAILED --retry--> PAID          AWAITING_APPROVAL --buyer approves + pays extra--> PAID (limit raised), then buy
 *                                           AWAITING_APPROVAL --buyer rejects--> CANCELLED (refund)
 *   PURCHASED --traveler hands over--> DELIVERED --buyer confirms--> SETTLED
 *   PENDING_PAYMENT / PAYMENT_FAILED / PAID --either side cancels--> CANCELLED
 */
public enum OrderStatus {
    PENDING_PAYMENT,
    PAYMENT_FAILED,
    PAID,
    AWAITING_APPROVAL,
    PURCHASED,
    DELIVERED,
    SETTLED,
    CANCELLED
}
