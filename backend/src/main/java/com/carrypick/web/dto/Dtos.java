package com.carrypick.web.dto;

import com.carrypick.domain.*;
import com.carrypick.service.PricingService.Quote;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class Dtos {
    private Dtos() {}

    public record UserDto(Long id, String email, String name, Mode mode, boolean test, String avatarUrl) {
        public static UserDto of(User u) {
            return new UserDto(u.getId(), u.getEmail(), u.getName(), u.getMode(), u.isTest(), u.getAvatarUrl());
        }
    }

    public record PersonDto(Long id, String name, String avatarUrl) {
        public static PersonDto of(User u) {
            return u == null ? null : new PersonDto(u.getId(), u.getName(), u.getAvatarUrl());
        }
    }

    public record AuthResponse(String token, UserDto user) {}

    public record TripDto(Long id, Long travelerId, String travelerName, String countryCode, String city,
                          LocalDate departDate, LocalDate returnDate, String luggageNote) {
        public static TripDto of(Trip t) {
            return new TripDto(t.getId(), t.getTraveler().getId(), t.getTraveler().getName(), t.getCountryCode(),
                    t.getCity(), t.getDepartDate(), t.getReturnDate(), t.getLuggageNote());
        }
    }

    public record OfferDto(Long id, PersonDto traveler, TripDto trip, String countryCode, String productName,
                           String store, String category, String description, String imageUrl, long estPrice,
                           long reward, int quantity, OfferStatus status, boolean bookable, Quote unitQuote,
                           String receiptUrl, ProductDto product) {}

    public record RequestDto(Long id, PersonDto buyer, PersonDto traveler, String countryCode, String productName,
                             String productLink, String imageUrl, String options, String note, long maxBudget,
                             long reward, LocalDate deadline, RequestStatus status, Quote quote,
                             Instant createdAt, Long orderId, ProductDto product) {}

    public record ProductDto(Long id, String name, String nameKo, String nameLocal, String aliases,
                             String category, String countryCode) {
        public static ProductDto of(com.carrypick.domain.Product p) {
            return p == null ? null : new ProductDto(p.getId(), p.getName(), p.getNameKo(), p.getNameLocal(),
                    p.getAliases(), p.getCategory(), p.getCountryCode());
        }
    }

    public record PaymentDto(Long id, PaymentType type, long amount, PaymentStatus status,
                             String failReason, boolean simulated, Instant createdAt) {
        public static PaymentDto of(Payment p) {
            return new PaymentDto(p.getId(), p.getType(), p.getAmount(), p.getStatus(), p.getFailReason(),
                    p.isSimulated(), p.getCreatedAt());
        }
    }

    public record SettlementDto(long travelerPayout, long buyerRefund, long platformFee, boolean mock,
                                Instant createdAt) {
        public static SettlementDto of(Settlement s) {
            return s == null ? null : new SettlementDto(s.getTravelerPayout(), s.getBuyerRefund(),
                    s.getPlatformFee(), s.isMock(), s.getCreatedAt());
        }
    }

    public record OrderDto(Long id, String myRole, OrderStatus status, String source, Long offerId,
                           Long requestId, PersonDto buyer, PersonDto traveler, String productName,
                           String countryCode, String imageUrl, String category, String options, String productLink,
                           int quantity,
                           long budget, long reward, long fee, long tax, long initialCharge, Long actualPrice,
                           String receiptUrl, Long quotedPrice, String priceTagUrl, long itemLimit,
                           long extraItemAmount, long extraFee, long extraCharge,
                           LocalDate expectedDelivery, String cancelReason,
                           Instant createdAt, Instant paidAt, Instant purchasedAt, Instant deliveredAt,
                           Instant completedAt, Instant settledAt, Instant cancelledAt,
                           List<PaymentDto> payments, SettlementDto settlement, long unreadMessages) {}

    public record ChatMessageDto(Long id, Long senderId, String senderName, boolean mine, String text,
                                 String imageUrl, Instant createdAt) {
        public static ChatMessageDto of(ChatMessage m, Long viewerId) {
            return new ChatMessageDto(m.getId(), m.getSender().getId(), m.getSender().getName(),
                    m.getSender().getId().equals(viewerId), m.getText(), m.getImageUrl(), m.getCreatedAt());
        }
    }

    public record NotificationDto(Long id, Long orderId, String kind, String actorName, String productName,
                                  Long amount, String message, boolean read, Instant createdAt) {
        public static NotificationDto of(Notification n) {
            return new NotificationDto(n.getId(), n.getOrderId(), n.getKind(), n.getActorName(), n.getProductName(),
                    n.getAmount(), n.getMessage(), n.isRead(), n.getCreatedAt());
        }
    }

    public record BoardRow(Long tripId, String countryCode, String city, LocalDate departDate, LocalDate returnDate,
                           String travelerName, int offerCount) {}

    public record ReceiptItem(String name, Double price, Integer quantity, String category) {}

    public record ReceiptScan(boolean mock, String model, String store, String date, String currency, Double total,
                              Long totalKrw, Double krwPerUnit, List<ReceiptItem> items, List<String> customsFlags,
                              String note) {}

    public record RankingItem(int rank, String productName, long orderCount, Long offerId, String imageUrl,
                              String category, Long productId, String nameKo,
                              Long estPrice) {}

    public record RankingDto(String countryCode, boolean demoData, int days, List<RankingItem> items) {}

    public record SearchDto(List<OfferDto> offers, List<RequestDto> requests) {}

    public record PaymentPrepareDto(String mode, String clientKey, String tossOrderId, String orderName,
                                    long amount, String type, String customerKey) {}

    public record ConfigDto(String paymentMode, String tossClientKey, double feeRate, long taxThresholdKrw,
                            double taxRate, List<Countries.Country> countries) {}
}
