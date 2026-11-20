package com.carrypick.domain;

public enum OrderStatus {
    PENDING_PAYMENT,
    PAYMENT_FAILED,
    PAID,
    AWAITING_APPROVAL,
    PURCHASED,
    DELIVERED,
    DISPUTED,
    SETTLED,
    CANCELLED
}
