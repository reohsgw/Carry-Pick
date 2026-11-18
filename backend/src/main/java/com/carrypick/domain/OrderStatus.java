package com.carrypick.domain;

public enum OrderStatus {
    PENDING_PAYMENT,
    PAYMENT_FAILED,
    PAID,
    AWAITING_APPROVAL,
    PURCHASED,
    DELIVERED,
    /** Someone reported a problem; settlement and the auto-confirm timer are paused. */
    DISPUTED,
    SETTLED,
    CANCELLED
}
