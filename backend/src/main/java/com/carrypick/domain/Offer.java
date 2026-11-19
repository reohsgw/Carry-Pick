package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "offers")
public class Offer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private User traveler;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private Trip trip;

    @Column(nullable = false, length = 2)
    private String countryCode;

    @Column(nullable = false)
    private String productName;

    @ManyToOne(fetch = FetchType.EAGER)
    private Product product;

    private String store;
    private String category;

    @Column(length = 1000)
    private String description;

    private String imageUrl;

    private long estPrice;

    /** Price per item in the trip country's currency (e.g. ¥1,500). The won price follows today's rate. */
    @Column(length = 3)
    private String priceCurrency;
    @Column(precision = 15, scale = 2)
    private java.math.BigDecimal priceLocal;

    private long reward;

    /** Estimated weight in grams, so travelers can judge whether it fits in their luggage. */
    private Integer weightGrams;

    private int quantity;

    private String receiptUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OfferStatus status = OfferStatus.ACTIVE;

    private Instant createdAt = Instant.now();

    protected Offer() {}

    public Offer(User traveler, Trip trip, String productName, String store, String category, String description,
                 String imageUrl, long estPrice, long reward, int quantity) {
        this.traveler = traveler;
        this.trip = trip;
        this.countryCode = trip.getCountryCode();
        this.productName = productName;
        this.store = store;
        this.category = Categories.normalize(category);
        this.description = description;
        this.imageUrl = imageUrl;
        this.estPrice = estPrice;
        this.reward = reward;
        this.quantity = quantity;
    }

    public boolean isBookable(LocalDate today) {
        return status == OfferStatus.ACTIVE && quantity > 0 && trip.getReturnDate().isAfter(today);
    }

    public void reserve(int qty) {
        this.quantity -= qty;
        if (this.quantity <= 0) {
            this.quantity = 0;
            this.status = OfferStatus.SOLD_OUT;
        }
    }

    public void release(int qty) {
        this.quantity += qty;
        if (this.status == OfferStatus.SOLD_OUT && this.quantity > 0) {
            this.status = OfferStatus.ACTIVE;
        }
    }

    public void update(String productName, String store, String category, String description, String imageUrl,
                       long estPrice, long reward, int quantity) {
        this.productName = productName;
        this.store = store;
        this.category = Categories.normalize(category);
        this.description = description;
        this.imageUrl = imageUrl;
        this.estPrice = estPrice;
        this.reward = reward;
        this.quantity = quantity;
        if (status == OfferStatus.SOLD_OUT && quantity > 0) status = OfferStatus.ACTIVE;
        if (status == OfferStatus.ACTIVE && quantity == 0) status = OfferStatus.SOLD_OUT;
    }

    public Long getId() { return id; }
    public User getTraveler() { return traveler; }
    public Trip getTrip() { return trip; }
    public String getCountryCode() { return countryCode; }
    public String getProductName() { return productName; }
    public String getStore() { return store; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = Categories.normalize(category); }
    public String getDescription() { return description; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public long getEstPrice() { return estPrice; }
    public long getReward() { return reward; }
    public int getQuantity() { return quantity; }
    public String getReceiptUrl() { return receiptUrl; }
    public void setReceiptUrl(String receiptUrl) { this.receiptUrl = receiptUrl; }
    public boolean isPurchased() { return receiptUrl != null; }
    public OfferStatus getStatus() { return status; }
    public void setStatus(OfferStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Integer getWeightGrams() { return weightGrams; }
    public void setWeightGrams(Integer weightGrams) { this.weightGrams = weightGrams; }

    /** Sets the local price and the won price it is worth at the given rate. */
    public void setLocalPrice(String currency, java.math.BigDecimal amount, double krwPerUnit) {
        this.priceCurrency = currency;
        this.priceLocal = amount;
        this.estPrice = Math.round(amount.doubleValue() * krwPerUnit);
    }
    public boolean hasLocalPrice() { return priceCurrency != null && priceLocal != null; }
    public String getPriceCurrency() { return priceCurrency; }
    public java.math.BigDecimal getPriceLocal() { return priceLocal; }
}
