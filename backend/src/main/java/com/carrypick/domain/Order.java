package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity(name = "CpOrder")
@Table(name = "orders")
public class Order {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private User traveler;

    @ManyToOne(fetch = FetchType.EAGER)
    private Offer offer;

    @ManyToOne(fetch = FetchType.EAGER)
    private PurchaseRequest request;

    @ManyToOne(fetch = FetchType.EAGER)
    private Product product;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false, length = 2)
    private String countryCode;

    private String imageUrl;

    private int quantity;

    private long budget;
    private long reward;
    private long fee;
    private long tax;

    private Long actualPrice;
    private String receiptUrl;

    private Long quotedPrice;
    private String priceTagUrl;

    private long extraItemAmount;

    @Column(length = 3)
    private String currency;
    private Double fxRate;
    @Column(precision = 15, scale = 2)
    private java.math.BigDecimal limitLocal;
    @Column(precision = 15, scale = 2)
    private java.math.BigDecimal quotedLocal;
    @Column(precision = 15, scale = 2)
    private java.math.BigDecimal actualLocal;
    private long extraFee;

    private LocalDate expectedDelivery;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status = OrderStatus.PENDING_PAYMENT;

    private String cancelReason;

    private Instant buyerChatReadAt;
    private Instant travelerChatReadAt;

    private Instant createdAt = Instant.now();
    private Instant paidAt;
    private Instant purchasedAt;
    private Instant deliveredAt;

    private String handoverMethod;
    private String handoverPhotoUrl;
    private Instant autoConfirmAt;

    private String disputeReason;
    @Column(length = 1000)
    private String disputeNote;
    private String disputePhotoUrl;
    private Boolean disputedByBuyer;
    private Instant disputedAt;
    @Enumerated(EnumType.STRING)
    private OrderStatus disputePrevStatus;
    private Instant completedAt;
    private Instant settledAt;
    private Instant cancelledAt;

    protected Order() {}

    public Order(User buyer, User traveler, Offer offer, PurchaseRequest request, String productName,
                 String countryCode, String imageUrl, int quantity, long budget, long reward, long fee, long tax,
                 LocalDate expectedDelivery) {
        this.buyer = buyer;
        this.traveler = traveler;
        this.offer = offer;
        this.request = request;
        this.product = offer != null ? offer.getProduct() : request != null ? request.getProduct() : null;
        this.productName = productName;
        this.countryCode = countryCode;
        this.imageUrl = imageUrl;
        this.quantity = quantity;
        this.budget = budget;
        this.reward = reward;
        this.fee = fee;
        this.tax = tax;
        this.expectedDelivery = expectedDelivery;
    }

    public long initialCharge() {
        return budget + reward + fee + tax;
    }

    public long extraCharge() {
        return extraItemAmount + extraFee;
    }

    public long itemLimit() {
        return budget + extraItemAmount;
    }

    public boolean isBuyer(Long userId) { return buyer.getId().equals(userId); }
    public boolean isTraveler(Long userId) { return traveler.getId().equals(userId); }

    public Long getId() { return id; }
    public User getBuyer() { return buyer; }
    public User getTraveler() { return traveler; }
    public Offer getOffer() { return offer; }
    public PurchaseRequest getRequest() { return request; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getCountryCode() { return countryCode; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public int getQuantity() { return quantity; }
    public long getBudget() { return budget; }
    public long getReward() { return reward; }
    public long getFee() { return fee; }
    public long getTax() { return tax; }
    public Long getActualPrice() { return actualPrice; }
    public void setActualPrice(Long actualPrice) { this.actualPrice = actualPrice; }
    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }
    public Long getQuotedPrice() { return quotedPrice; }
    public void setQuotedPrice(Long quotedPrice) { this.quotedPrice = quotedPrice; }
    public String getPriceTagUrl() { return priceTagUrl; }
    public void setPriceTagUrl(String priceTagUrl) { this.priceTagUrl = priceTagUrl; }
    public long getExtraItemAmount() { return extraItemAmount; }
    public void setExtraItemAmount(long extraItemAmount) { this.extraItemAmount = extraItemAmount; }
    public long getExtraFee() { return extraFee; }
    public void setExtraFee(long extraFee) { this.extraFee = extraFee; }
    public LocalDate getExpectedDelivery() { return expectedDelivery; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public String getCancelReason() { return cancelReason; }
    public void setCancelReason(String cancelReason) { this.cancelReason = cancelReason; }
    public Instant getBuyerChatReadAt() { return buyerChatReadAt; }
    public void setBuyerChatReadAt(Instant at) { this.buyerChatReadAt = at; }
    public Instant getTravelerChatReadAt() { return travelerChatReadAt; }
    public void setTravelerChatReadAt(Instant at) { this.travelerChatReadAt = at; }
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public Instant getPurchasedAt() { return purchasedAt; }
    public void setPurchasedAt(Instant purchasedAt) { this.purchasedAt = purchasedAt; }
    public Instant getDeliveredAt() { return deliveredAt; }
    public String getHandoverMethod() { return handoverMethod; }
    public String getHandoverPhotoUrl() { return handoverPhotoUrl; }
    public void setHandover(String method, String photoUrl) { this.handoverMethod = method; this.handoverPhotoUrl = photoUrl; }
    public Instant getAutoConfirmAt() { return autoConfirmAt; }
    public void setAutoConfirmAt(Instant autoConfirmAt) { this.autoConfirmAt = autoConfirmAt; }
    public String getDisputeReason() { return disputeReason; }
    public String getDisputeNote() { return disputeNote; }
    public String getDisputePhotoUrl() { return disputePhotoUrl; }
    public Boolean getDisputedByBuyer() { return disputedByBuyer; }
    public Instant getDisputedAt() { return disputedAt; }
    public OrderStatus getDisputePrevStatus() { return disputePrevStatus; }
    public void openDispute(boolean byBuyer, String reason, String note, String photoUrl, Instant at) {
        this.disputePrevStatus = this.status;
        this.disputedByBuyer = byBuyer;
        this.disputeReason = reason;
        this.disputeNote = note;
        this.disputePhotoUrl = photoUrl;
        this.disputedAt = at;
        this.status = OrderStatus.DISPUTED;
    }
    public void setDeliveredAt(Instant deliveredAt) { this.deliveredAt = deliveredAt; }
    public Instant getCompletedAt() { return completedAt; }
    public void setCompletedAt(Instant completedAt) { this.completedAt = completedAt; }
    public Instant getSettledAt() { return settledAt; }
    public void setSettledAt(Instant settledAt) { this.settledAt = settledAt; }
    public Instant getCancelledAt() { return cancelledAt; }
    public void setCancelledAt(Instant cancelledAt) { this.cancelledAt = cancelledAt; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public void lockCurrency(String currency, double krwPerUnit, java.math.BigDecimal limitLocal) {
        this.currency = currency;
        this.fxRate = krwPerUnit;
        this.limitLocal = limitLocal;
    }
    public boolean hasLocalPrices() { return currency != null && fxRate != null && limitLocal != null; }
    public java.math.BigDecimal localLimit() {
        return extraItemAmount > 0 && quotedLocal != null ? quotedLocal : limitLocal;
    }
    public long toKrw(java.math.BigDecimal local) { return Math.round(local.doubleValue() * fxRate); }
    public java.math.BigDecimal wonToLocal(long krw) { return fromWon(krw, fxRate); }
    public static java.math.BigDecimal fromWon(long krw, double krwPerUnit) {
        return java.math.BigDecimal.valueOf(krw).divide(java.math.BigDecimal.valueOf(krwPerUnit), 2, java.math.RoundingMode.HALF_UP);
    }
    public static java.math.BigDecimal toLocal(long krw, double krwPerUnit, int decimals) {
        return java.math.BigDecimal.valueOf(krw).divide(java.math.BigDecimal.valueOf(krwPerUnit), decimals, java.math.RoundingMode.FLOOR);
    }
    public String getCurrency() { return currency; }
    public Double getFxRate() { return fxRate; }
    public java.math.BigDecimal getLimitLocal() { return limitLocal; }
    public java.math.BigDecimal getQuotedLocal() { return quotedLocal; }
    public void setQuotedLocal(java.math.BigDecimal quotedLocal) { this.quotedLocal = quotedLocal; }
    public java.math.BigDecimal getActualLocal() { return actualLocal; }
    public void setActualLocal(java.math.BigDecimal actualLocal) { this.actualLocal = actualLocal; }
}
