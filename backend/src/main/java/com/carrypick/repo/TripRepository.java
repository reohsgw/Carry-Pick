package com.carrypick.repo;

import com.carrypick.domain.Trip;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

/**
 * Method names become queries; read them out loud and they describe the SQL.
 * @EntityGraph("traveler") loads the traveler in the same query instead of one extra query per trip.
 */
public interface TripRepository extends JpaRepository<Trip, Long> {
    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByReturnDateGreaterThanEqualOrderByDepartDateAsc(LocalDate today);

    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByTravelerIdOrderByDepartDateAsc(Long travelerId);

    /** Trips of this traveler that have not ended yet. */
    @EntityGraph(attributePaths = "traveler")
    List<Trip> findByTravelerIdAndReturnDateGreaterThanEqualOrderByDepartDateAsc(Long travelerId, LocalDate today);
}
