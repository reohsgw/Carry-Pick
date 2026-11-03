package com.carrypick.domain;

import jakarta.persistence.*;

import java.time.LocalDate;

/**
 * EXAMPLE ENTITY (complete). A traveler's trip abroad.
 * @ManyToOne = many trips belong to one user (a "traveler_id" column is created).
 */
@Entity
public class Trip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    private User traveler;

    @Column(nullable = false, length = 2)
    private String countryCode; // "JP", "US", "FR" ...

    @Column(length = 60)
    private String city;

    @Column(nullable = false)
    private LocalDate departDate;

    @Column(nullable = false)
    private LocalDate returnDate;

    @Column(length = 500)
    private String luggageNote; // "1 carry-on, about 5 kg"

    protected Trip() {}

    public Trip(User traveler, String countryCode, String city, LocalDate departDate, LocalDate returnDate, String luggageNote) {
        this.traveler = traveler;
        this.countryCode = countryCode;
        this.city = city;
        this.departDate = departDate;
        this.returnDate = returnDate;
        this.luggageNote = luggageNote;
    }

    public Long getId() { return id; }
    public User getTraveler() { return traveler; }
    public String getCountryCode() { return countryCode; }
    public String getCity() { return city; }
    public LocalDate getDepartDate() { return departDate; }
    public LocalDate getReturnDate() { return returnDate; }
    public String getLuggageNote() { return luggageNote; }
}
