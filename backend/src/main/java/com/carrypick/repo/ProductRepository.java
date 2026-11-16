package com.carrypick.repo;

import com.carrypick.domain.Product;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long> {

    @Query("select p from Product p where p.searchKey like concat('%', :key, '%') order by p.createdAt asc")
    List<Product> findByKeyContaining(@Param("key") String key, Pageable page);

    @Query("select p from Product p where p.searchKey like concat('%|', :key, '|%') order by p.createdAt asc")
    List<Product> findByExactKey(@Param("key") String key);
}
