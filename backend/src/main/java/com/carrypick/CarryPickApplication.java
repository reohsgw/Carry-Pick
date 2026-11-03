package com.carrypick;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@ConfigurationPropertiesScan // reads the "app:" settings in application.yml into AppProperties
@EnableScheduling            // runs MarketService.housekeeping() every hour
public class CarryPickApplication {
    public static void main(String[] args) {
        SpringApplication.run(CarryPickApplication.class, args);
    }
}
