package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "purchase_requests")
public class PurchaseRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.EAGER)
    private User traveler;

    @Column(nullable = false, length = 2)
    private String countryCode;

    @Column(nullable = false)
    private String productName;

    @ManyToOne(fetch = FetchType.EAGER)
    private Product product;

    @Column(length = 1000)
    private String productLink;

    private String imageUrl;

    private String options;

    @Column(length = 1000)
    private String note;

    private long maxBudget;

    private long reward;

    /** Estimated weight in grams, so travelers can judge whether it fits in their luggage. */
    private Integer weightGrams;

    @Column(nullable = false)
    private LocalDate deadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RequestStatus status = RequestStatus.OPEN;

    private Instant createdAt = Instant.now();

    @Column(length = 1000)
    private String excludedTravelers;

    protected PurchaseRequest() {}

    public PurchaseRequest(User buyer, String countryCode, String productName, String productLink, String imageUrl,
                           String options, String note, long maxBudget, long reward, LocalDate deadline) {
        this.buyer = buyer;
        this.countryCode = countryCode;
        this.productName = productName;
        this.productLink = productLink;
        this.imageUrl = imageUrl;
        this.options = options;
        this.note = note;
        this.maxBudget = maxBudget;
        this.reward = reward;
        this.deadline = deadline;
    }

    public Long getId() { return id; }
    public User getBuyer() { return buyer; }
    public User getTraveler() { return traveler; }
    public void setTraveler(User traveler) { this.traveler = traveler; }
    public String getCountryCode() { return countryCode; }
    public String getProductName() { return productName; }
    public void setProductName(String productName) { this.productName = productName; }
    public String getProductLink() { return productLink; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getOptions() { return options; }
    public String getNote() { return note; }
    public long getMaxBudget() { return maxBudget; }
    public long getReward() { return reward; }
    public LocalDate getDeadline() { return deadline; }
    public RequestStatus getStatus() { return status; }
    public void setStatus(RequestStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }

    public boolean excludes(Long travelerId) {
        if (excludedTravelers == null || travelerId == null) return false;
        for (String s : excludedTravelers.split(",")) if (s.equals(String.valueOf(travelerId))) return true;
        return false;
    }

    public void exclude(Long travelerId) {
        if (travelerId == null || excludes(travelerId)) return;
        excludedTravelers = excludedTravelers == null || excludedTravelers.isBlank()
                ? String.valueOf(travelerId) : excludedTravelers + "," + travelerId;
    }

    public Integer getWeightGrams() { return weightGrams; }
    public void setWeightGrams(Integer weightGrams) { this.weightGrams = weightGrams; }
    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }
}
