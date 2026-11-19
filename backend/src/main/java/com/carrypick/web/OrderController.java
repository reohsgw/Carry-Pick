package com.carrypick.web;

import com.carrypick.config.AuthUser;
import com.carrypick.domain.Notification;
import com.carrypick.repo.NotificationRepository;
import com.carrypick.service.ChatService;
import com.carrypick.service.OrderService;
import com.carrypick.service.PaymentService;
import com.carrypick.web.dto.Dtos.ChatMessageDto;
import com.carrypick.web.dto.Dtos.NotificationDto;
import com.carrypick.web.dto.Dtos.OrderDto;
import com.carrypick.web.dto.Dtos.PaymentPrepareDto;
import com.carrypick.web.dto.Forms.*;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api")
public class OrderController {
    private final OrderService orders;
    private final PaymentService payments;
    private final NotificationRepository notifications;
    private final ChatService chat;

    public OrderController(OrderService orders, PaymentService payments, NotificationRepository notifications,
                           ChatService chat) {
        this.orders = orders;
        this.payments = payments;
        this.notifications = notifications;
        this.chat = chat;
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    public OrderDto book(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody BookForm form) {
        return orders.book(me.id(), form);
    }

    @GetMapping("/orders/me")
    public List<OrderDto> myOrders(@AuthenticationPrincipal AuthUser me,
                                   @RequestParam(defaultValue = "buyer") String role) {
        return orders.myOrders(me.id(), role);
    }

    @GetMapping("/orders/{id}")
    public OrderDto get(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return orders.get(me.id(), id);
    }

    @PostMapping(value = "/orders/{id}/purchase", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OrderDto purchase(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                             @RequestParam(required = false) Long actualPrice,
                             @RequestParam(required = false) java.math.BigDecimal actualLocal,
                             @RequestPart("receipt") MultipartFile receipt) {
        return orders.purchase(me.id(), id, actualPrice, actualLocal, receipt);
    }

    @PostMapping(value = "/orders/{id}/price-check", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OrderDto priceCheck(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                               @RequestParam(required = false) Long price,
                               @RequestParam(required = false) java.math.BigDecimal priceLocal,
                               @RequestPart("photo") MultipartFile photo) {
        return orders.priceCheck(me.id(), id, price, priceLocal, photo);
    }

    @PostMapping("/orders/{id}/approve")
    public PaymentPrepareDto approve(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return payments.prepare(me.id(), id);
    }

    @PostMapping("/orders/{id}/reject")
    public OrderDto reject(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                           @RequestBody(required = false) RejectForm form) {
        return orders.reject(me.id(), id, form != null && form.reopenRequest());
    }

    @PostMapping(value = "/orders/{id}/deliver", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OrderDto deliver(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                            @RequestParam(defaultValue = "IN_PERSON") String method,
                            @RequestPart(value = "proof", required = false) MultipartFile proof) {
        return orders.deliver(me.id(), id, method, proof);
    }

    @PostMapping(value = "/orders/{id}/report", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public OrderDto report(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                           @RequestParam String reason, @RequestParam(required = false) String note,
                           @RequestPart(value = "photo", required = false) MultipartFile photo) {
        return orders.report(me.id(), id, reason, note, photo);
    }

    @PostMapping("/orders/{id}/resolve")
    public OrderDto resolve(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                            @Valid @RequestBody ResolveForm form) {
        return orders.resolve(me.id(), id, form.action());
    }

    @PostMapping("/orders/{id}/confirm")
    public OrderDto confirm(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return orders.confirm(me.id(), id);
    }

    @PostMapping("/orders/{id}/cancel")
    public OrderDto cancel(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                           @RequestBody(required = false) CancelForm form) {
        return orders.cancel(me.id(), id, form == null ? null : form.reason());
    }

    @GetMapping("/orders/{id}/messages")
    public List<ChatMessageDto> messages(@AuthenticationPrincipal AuthUser me, @PathVariable Long id) {
        return chat.list(me.id(), id);
    }

    @PostMapping("/orders/{id}/messages")
    @ResponseStatus(HttpStatus.CREATED)
    public ChatMessageDto send(@AuthenticationPrincipal AuthUser me, @PathVariable Long id,
                               @Valid @RequestBody MessageForm form) {
        return chat.send(me.id(), id, form.text(), form.imageUrl());
    }

    @PostMapping("/payments/prepare")
    public PaymentPrepareDto prepare(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody PrepareForm form) {
        return payments.prepare(me.id(), form.orderId());
    }

    @PostMapping("/payments/confirm")
    public OrderDto confirmPayment(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody ConfirmForm form) {
        return payments.confirm(me.id(), form);
    }

    @PostMapping("/payments/fail")
    public OrderDto failPayment(@AuthenticationPrincipal AuthUser me, @Valid @RequestBody FailForm form) {
        return payments.fail(me.id(), form);
    }

    @GetMapping("/notifications")
    public List<NotificationDto> notifications(@AuthenticationPrincipal AuthUser me) {
        return notifications.findTop50ByUserIdOrderByCreatedAtDesc(me.id()).stream().map(NotificationDto::of).toList();
    }

    @PostMapping("/notifications/read-all")
    @Transactional
    public void readAll(@AuthenticationPrincipal AuthUser me) {
        for (Notification n : notifications.findTop50ByUserIdOrderByCreatedAtDesc(me.id())) {
            if (!n.isRead()) n.setRead(true);
        }
    }
}
