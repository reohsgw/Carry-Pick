package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.config.AppProperties;
import com.carrypick.domain.PaymentStatus;
import com.carrypick.domain.OrderStatus;
import com.carrypick.domain.PaymentType;
import com.carrypick.domain.Order;
import com.carrypick.domain.Payment;
import com.carrypick.repo.PaymentRepository;
import com.carrypick.web.dto.Dtos.OrderDto;
import com.carrypick.web.dto.Dtos.PaymentPrepareDto;
import com.carrypick.web.dto.Forms.ConfirmForm;
import com.carrypick.web.dto.Forms.FailForm;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class PaymentService {
    private final PaymentRepository payments;
    private final OrderService orderService;
    private final TossClient toss;
    private final AppProperties.Payment cfg;
    private final Mapper mapper;

    public PaymentService(PaymentRepository payments, OrderService orderService, TossClient toss,
                          AppProperties props, Mapper mapper) {
        this.payments = payments;
        this.orderService = orderService;
        this.toss = toss;
        this.cfg = props.payment();
        this.mapper = mapper;
    }

    @Transactional
    public PaymentPrepareDto prepare(Long userId, Long orderId) {
        Order o = orderService.findForParticipant(userId, orderId);
        OrderService.requireBuyer(o, userId);

        PaymentType type;
        long amount;
        if (o.getStatus() == OrderStatus.PENDING_PAYMENT || o.getStatus() == OrderStatus.PAYMENT_FAILED) {
            type = PaymentType.INITIAL;
            amount = o.initialCharge();
        } else if (o.getStatus() == OrderStatus.AWAITING_APPROVAL) {
            type = PaymentType.EXTRA;
            amount = o.extraCharge();
        } else {
            throw ApiException.conflict("NOTHING_TO_PAY", "There is nothing to pay for this order right now");
        }
        String tossOrderId = "CP-" + o.getId() + "-" + type.name().charAt(0) + "-"
                + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        payments.save(new Payment(o, type, amount, tossOrderId, cfg.isMock()));

        String orderName = (type == PaymentType.EXTRA ? "[Extra] " : "") + o.getProductName();
        if (orderName.length() > 90) orderName = orderName.substring(0, 90);
        return new PaymentPrepareDto(cfg.isMock() ? "mock" : "toss", cfg.isMock() ? null : cfg.tossClientKey(),
                tossOrderId, orderName, amount, type.name(), customerKey(userId));
    }

    @Transactional
    public OrderDto confirm(Long userId, ConfirmForm f) {
        Payment p = payments.findByTossOrderId(f.tossOrderId())
                .orElseThrow(() -> ApiException.notFound("Payment"));
        Order o = orderService.findForParticipant(userId, p.getOrder().getId());
        OrderService.requireBuyer(o, userId);

        if (p.getStatus() == PaymentStatus.SUCCESS) {
            return mapper.order(o, userId);
        }
        if (p.getStatus() != PaymentStatus.READY) {
            throw ApiException.conflict("PAYMENT_CLOSED", "This payment attempt is already closed");
        }
        if (f.amount() != p.getAmount()) {
            markFailed(p, o, "Amount mismatch");
            throw ApiException.badRequest("AMOUNT_MISMATCH", "Payment amount does not match the order");
        }
        boolean statusOk = p.getType() == PaymentType.INITIAL
                ? (o.getStatus() == OrderStatus.PENDING_PAYMENT || o.getStatus() == OrderStatus.PAYMENT_FAILED)
                : o.getStatus() == OrderStatus.AWAITING_APPROVAL;
        if (!statusOk) {
            markFailed(p, o, "Order status changed");
            throw ApiException.conflict("WRONG_STATUS", "The order is no longer waiting for this payment");
        }

        TossClient.Result result = toss.confirm(f.paymentKey(), f.tossOrderId(), f.amount());
        p.setPaymentKey(f.paymentKey());
        if (!result.success()) {
            markFailed(p, o, result.message());
            return mapper.order(o, userId);
        }
        p.setStatus(PaymentStatus.SUCCESS);
        p.setCompletedAt(Instant.now());
        if (p.getType() == PaymentType.INITIAL) {
            orderService.markPaid(o);
        } else {
            orderService.onExtraPaymentSuccess(o);
        }
        return mapper.order(o, userId);
    }

    @Transactional
    public OrderDto fail(Long userId, FailForm f) {
        Payment p = payments.findByTossOrderId(f.tossOrderId())
                .orElseThrow(() -> ApiException.notFound("Payment"));
        Order o = orderService.findForParticipant(userId, p.getOrder().getId());
        OrderService.requireBuyer(o, userId);
        if (p.getStatus() == PaymentStatus.READY) {
            String reason = f.message() != null && !f.message().isBlank() ? f.message()
                    : (f.code() != null ? f.code() : "Payment cancelled");
            markFailed(p, o, reason);
        }
        return mapper.order(o, userId);
    }

    private String customerKey(Long userId) {
        return UUID.nameUUIDFromBytes(("carrypick-customer-" + userId + "-" + cfg.tossClientKey())
                .getBytes(java.nio.charset.StandardCharsets.UTF_8)).toString();
    }

    private void markFailed(Payment p, Order o, String reason) {
        p.setStatus(PaymentStatus.FAILED);
        p.setFailReason(reason);
        p.setCompletedAt(Instant.now());
        if (p.getType() == PaymentType.INITIAL && o.getStatus() == OrderStatus.PENDING_PAYMENT) {
            orderService.onInitialPaymentFailed(o, reason);
        }
    }
}
