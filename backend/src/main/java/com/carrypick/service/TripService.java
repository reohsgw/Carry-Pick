package com.carrypick.service;

import com.carrypick.common.ApiException;
import com.carrypick.domain.Countries;
import com.carrypick.domain.Trip;
import com.carrypick.domain.User;
import com.carrypick.repo.TripRepository;
import com.carrypick.web.dto.Dtos.TripDto;
import com.carrypick.web.dto.Forms.TripForm;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class TripService {
    private final TripRepository trips;
    private final AuthService auth;

    public TripService(TripRepository trips, AuthService auth) {
        this.trips = trips;
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
        LocalDate today = Today.get();
        if (!Countries.exists(f.countryCode())) throw ApiException.badRequest("COUNTRY", "Unsupported country");
        if (!f.departDate().isAfter(today)) {
            throw ApiException.badRequest("TRIP_DATE", "Departure date must be in the future");
        }
        if (f.returnDate().isBefore(f.departDate())) {
            throw ApiException.badRequest("TRIP_DATE", "Return date must be on or after the departure date");
        }
        Trip t = trips.save(new Trip(traveler, f.countryCode().toUpperCase(), blankToNull(f.city()),
                f.departDate(), f.returnDate(), blankToNull(f.luggageNote())));
        return TripDto.of(t);
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
