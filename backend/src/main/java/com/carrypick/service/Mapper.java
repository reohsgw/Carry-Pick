package com.carrypick.service;

import com.carrypick.domain.Offer;
import com.carrypick.domain.Order;
import com.carrypick.domain.OrderStatus;
import com.carrypick.domain.PurchaseRequest;
import com.carrypick.repo.ChatMessageRepository;
import com.carrypick.repo.OrderRepository;
import com.carrypick.repo.PaymentRepository;
import com.carrypick.repo.SettlementRepository;
import com.carrypick.web.dto.Dtos.*;
import org.springframework.stereotype.Component;

@Component
public class Mapper {
    private final PricingService pricing;
    private final PaymentRepository payments;
    private final SettlementRepository settlements;
    private final OrderRepository orders;
    private final ChatMessageRepository chat;

    private final ExchangeRateService fx;

    public Mapper(PricingService pricing, PaymentRepository payments, SettlementRepository settlements,
                  OrderRepository orders, ChatMessageRepository chat, ExchangeRateService fx) {
        this.fx = fx;
        this.pricing = pricing;
        this.payments = payments;
        this.settlements = settlements;
        this.orders = orders;
        this.chat = chat;
    }

    public OfferDto offer(Offer o) {
        long price = fx.offerPriceKrw(o);
        return new OfferDto(o.getId(), PersonDto.of(o.getTraveler()), TripDto.of(o.getTrip()), o.getCountryCode(),
                o.getProductName(), o.getStore(), o.getCategory(), o.getDescription(), o.getImageUrl(),
                price, o.getReward(), o.getQuantity(), o.getStatus(), o.isBookable(Today.get()),
                pricing.quote(price, o.getReward()), o.getReceiptUrl(), ProductDto.of(o.getProduct()), o.getWeightGrams(),
                o.getPriceCurrency(), o.getPriceLocal());
    }

    public RequestDto request(PurchaseRequest r) {
        Long orderId = r.getTraveler() == null ? null
                : orders.findFirstByRequestIdOrderByCreatedAtDesc(r.getId()).map(Order::getId).orElse(null);
        return new RequestDto(r.getId(), PersonDto.of(r.getBuyer()), PersonDto.of(r.getTraveler()),
                r.getCountryCode(), r.getProductName(), r.getProductLink(), r.getImageUrl(), r.getOptions(),
                r.getNote(), r.getMaxBudget(), r.getReward(), r.getDeadline(), r.getStatus(),
                pricing.quote(r.getMaxBudget(), r.getReward()), r.getCreatedAt(), orderId, ProductDto.of(r.getProduct()), r.getWeightGrams(),
                r.getBudgetCurrency(), r.getBudgetLocal(), r.getFxRate());
    }

    public OrderDto order(Order o, Long viewerId) {
        String role = o.isBuyer(viewerId) ? "BUYER" : "TRAVELER";
        return build(o, role, true, unread(o, viewerId));
    }

    public OrderDto orderSummary(Order o, Long viewerId) {
        String role = o.isBuyer(viewerId) ? "BUYER" : "TRAVELER";
        return build(o, role, false, unread(o, viewerId));
    }

    private long unread(Order o, Long viewerId) {
        java.time.Instant readAt = o.isBuyer(viewerId) ? o.getBuyerChatReadAt() : o.getTravelerChatReadAt();
        return readAt == null ? chat.countByOrderIdAndSenderIdNot(o.getId(), viewerId)
                : chat.countByOrderIdAndSenderIdNotAndCreatedAtAfter(o.getId(), viewerId, readAt);
    }

    private OrderDto build(Order o, String role, boolean full, long unreadMessages) {
        PurchaseRequest r = o.getRequest();
        return new OrderDto(o.getId(), role, o.getStatus(), r != null ? "REQUEST" : "OFFER",
                o.getOffer() != null ? o.getOffer().getId() : null, r != null ? r.getId() : null,
                PersonDto.of(o.getBuyer()), PersonDto.of(o.getTraveler()), o.getProductName(), o.getCountryCode(),
                o.getImageUrl(), o.getOffer() != null ? o.getOffer().getCategory() : null,
                r != null ? r.getOptions() : null, r != null ? r.getProductLink() : null,
                o.getQuantity(), o.getBudget(), o.getReward(), o.getFee(), o.getTax(), o.initialCharge(),
                o.getActualPrice(), o.getReceiptUrl(), o.getQuotedPrice(), o.getPriceTagUrl(), o.itemLimit(),
                o.getExtraItemAmount(), o.getExtraFee(), o.extraCharge(),
                o.getExpectedDelivery(), o.getCancelReason(), o.getCreatedAt(), o.getPaidAt(), o.getPurchasedAt(),
                o.getDeliveredAt(), o.getCompletedAt(), o.getSettledAt(), o.getCancelledAt(),
                full ? payments.findByOrderIdOrderByCreatedAtAsc(o.getId()).stream().map(PaymentDto::of).toList() : java.util.List.of(),
                full ? SettlementDto.of(settlements.findByOrderId(o.getId()).orElse(null)) : null,
                unreadMessages,
                o.getHandoverMethod(), o.getHandoverPhotoUrl(), o.getAutoConfirmAt(),
                o.getStatus() == OrderStatus.DISPUTED && o.getDisputedByBuyer() != null
                        ? new DisputeDto(o.getDisputeReason(), o.getDisputeNote(), o.getDisputePhotoUrl(),
                                o.getDisputedByBuyer() ? "BUYER" : "TRAVELER",
                                o.getDisputedByBuyer() == "BUYER".equals(role), o.getDisputedAt())
                        : null,
                o.getCurrency(), o.getFxRate(), o.hasLocalPrices() ? o.localLimit() : null,
                o.getQuotedLocal(), o.getActualLocal());
    }
}
