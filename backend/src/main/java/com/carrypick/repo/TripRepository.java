package com.carrypick.repo;

import com.carrypick.domain.Trip;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface TripRepository extends JpaRepository<Trip, Long> {
    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByReturnDateGreaterThanEqualOrderByDepartDateAsc(LocalDate today);

    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByTravelerIdOrderByDepartDateAsc(Long travelerId);

    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByTravelerIdAndReturnDateGreaterThanEqualOrderByDepartDateAsc(Long travelerId, LocalDate today);
}
