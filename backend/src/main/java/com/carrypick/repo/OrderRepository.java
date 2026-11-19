package com.carrypick.repo;

import com.carrypick.domain.OrderStatus;
import com.carrypick.domain.Order;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<Order, Long> {

    List<Order> findByBuyerIdOrderByCreatedAtDesc(Long buyerId);

    List<Order> findByTravelerIdOrderByCreatedAtDesc(Long travelerId);

    List<Order> findByStatus(com.carrypick.domain.OrderStatus status);

    Optional<Order> findFirstByRequestIdOrderByCreatedAtDesc(Long requestId);

    @Query("""
            select o.product.id, count(o) from CpOrder o
            where o.countryCode = :country and o.status in :statuses and o.createdAt >= :since
              and o.product is not null
            group by o.product.id
            order by count(o) desc, max(o.createdAt) desc
            """)
    List<Object[]> rankProducts(@Param("country") String country,
                                @Param("statuses") Collection<OrderStatus> statuses,
                                @Param("since") Instant since);

    @Query("""
            select o.product.id, count(o) from CpOrder o
            where o.status in :statuses and o.createdAt >= :since and o.product is not null
            group by o.product.id
            order by count(o) desc, max(o.createdAt) desc
            """)
    List<Object[]> rankProductsAllCountries(@Param("statuses") Collection<OrderStatus> statuses,
                                            @Param("since") Instant since);

    Optional<Order> findFirstByProductIdOrderByCreatedAtDesc(Long productId);

    List<Order> findByProductIsNull();

    boolean existsByOfferIdIn(Collection<Long> offerIds);
}
