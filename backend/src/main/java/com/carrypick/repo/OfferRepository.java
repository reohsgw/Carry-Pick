package com.carrypick.repo;

import com.carrypick.domain.OfferStatus;
import com.carrypick.domain.Offer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface OfferRepository extends JpaRepository<Offer, Long> {

    List<Offer> findByCountryCodeAndStatusOrderByCreatedAtDesc(String countryCode, OfferStatus status);

    List<Offer> findByStatusOrderByCreatedAtDesc(OfferStatus status);

    List<Offer> findByProductIdInAndStatus(Collection<Long> productIds, OfferStatus status);

    List<Offer> findByProductIdAndStatusOrderByCreatedAtDesc(Long productId, OfferStatus status);

    List<Offer> findByProductIsNull();

    List<Offer> findByTravelerIdOrderByCreatedAtDesc(Long travelerId);

    @Query("""
            select o from Offer o
            where o.status = :status
              and (lower(o.productName) like lower(concat('%', :q, '%'))
                   or lower(coalesce(o.store, '')) like lower(concat('%', :q, '%'))
                   or lower(coalesce(o.category, '')) like lower(concat('%', :q, '%')))
            order by o.createdAt desc
            """)
    List<Offer> search(@Param("q") String q, @Param("status") OfferStatus status);

    @Modifying
    @Query("""
            update Offer o set o.status = :closed
            where o.status <> :closed
              and o.trip.id in (select t.id from Trip t where t.returnDate < :today)
            """)
    int closeEnded(@Param("today") LocalDate today, @Param("closed") OfferStatus closed);
}
