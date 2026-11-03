package com.carrypick.domain;

/**
 * Where an order is in its life. This is the heart of the app - draw it on paper first!
 *
 *   PENDING_PAYMENT --pay ok--> PAID --traveler buys, price <= budget--> PURCHASED
 *        |  pay fails                 \--price > budget--> AWAITING_APPROVAL --buyer approves + pays extra--> PURCHASED
 *        v                                                        \--buyer rejects--> CANCELLED (refund)
 *   PAYMENT_FAILED --retry--> PAID
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
