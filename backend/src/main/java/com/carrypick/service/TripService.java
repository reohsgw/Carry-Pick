package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.domain.Countries;
import com.carrypick.domain.Trip;
import com.carrypick.domain.User;
import com.carrypick.domain.Offer;
import com.carrypick.repo.OfferRepository;
import com.carrypick.repo.OrderRepository;
import com.carrypick.repo.TripRepository;
import com.carrypick.web.dto.Dtos.TripDto;
import com.carrypick.web.dto.Forms.TripForm;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TripService {
    private final TripRepository trips;
    private final OfferRepository offers;
    private final OrderRepository orders;
    private final AuthService auth;

    public TripService(TripRepository trips, OfferRepository offers, OrderRepository orders, AuthService auth) {
        this.trips = trips;
        this.offers = offers;
        this.orders = orders;
        this.auth = auth;
    }

    @Transactional(readOnly = true)
    public List<TripDto> upcoming() {
        return trips.findByReturnDateGreaterThanEqualOrderByDepartDateAsc(Today.get()).stream().map(TripDto::of).toList();
    }

    @Transactional(readOnly = true)
    public List<TripDto> mine(Long userId, boolean includePast) {
        List<Trip> list = includePast
                ? trips.findByTravelerIdOrderByDepartDateAsc(userId)
                : trips.findByTravelerIdAndReturnDateGreaterThanEqualOrderByDepartDateAsc(userId, Today.get());
        return list.stream().map(TripDto::of).toList();
    }

    @Transactional
    public TripDto create(Long userId, TripForm f) {
        User traveler = auth.require(userId);
        validate(f);
        Trip t = trips.save(new Trip(traveler, f.countryCode().toUpperCase(), blankToNull(f.city()),
                f.departDate(), f.returnDate(), blankToNull(f.luggageNote())));
        return TripDto.of(t);
    }

    /** The traveler edits their own trip until bookings close (the day before they return). The country is fixed once products are posted on it. */
    @Transactional
    public TripDto update(Long userId, Long tripId, TripForm f) {
        Trip t = trips.findById(tripId).orElseThrow(() -> ApiException.notFound("Trip"));
        if (!t.getTraveler().getId().equals(userId)) throw ApiException.forbidden("Only the traveler can edit this trip");
        if (!t.getReturnDate().isAfter(Today.get())) {
            throw ApiException.conflict("TRIP_ENDED", "Bookings for this trip have closed, so it can't be edited");
        }
        validate(f);
        String country = f.countryCode().toUpperCase();
        if (!country.equals(t.getCountryCode()) && offers.existsByTripId(t.getId())) {
            throw ApiException.conflict("TRIP_HAS_OFFERS", "Products are posted on this trip, so its country can't change");
        }
        t.update(country, blankToNull(f.city()), f.departDate(), f.returnDate(), blankToNull(f.luggageNote()));
        return TripDto.of(t);
    }

    /**
     * The traveler deletes their own trip. Products posted on it go too, unless someone has already
     * ordered one: then the trip stays, so no order loses its history.
     */
    @Transactional
    public void delete(Long userId, Long tripId) {
        Trip t = trips.findById(tripId).orElseThrow(() -> ApiException.notFound("Trip"));
        if (!t.getTraveler().getId().equals(userId)) throw ApiException.forbidden("Only the traveler can delete this trip");
        List<Offer> posted = offers.findByTripId(t.getId());
        if (!posted.isEmpty() && orders.existsByOfferIdIn(posted.stream().map(Offer::getId).toList())) {
            throw ApiException.conflict("TRIP_HAS_ORDERS", "Someone has ordered from this trip, so it can't be deleted");
        }
        offers.deleteAll(posted);
        trips.delete(t);
    }

    private static void validate(TripForm f) {
        if (!Countries.exists(f.countryCode())) throw ApiException.badRequest("COUNTRY", "Unsupported country");
        if (f.departDate().isBefore(Today.get())) {
            throw ApiException.badRequest("TRIP_DATE", "Departure date can't be in the past");
        }
        if (f.returnDate().isBefore(f.departDate())) {
            throw ApiException.badRequest("TRIP_DATE", "Return date must be on or after the departure date");
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
