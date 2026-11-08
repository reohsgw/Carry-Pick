package com.carrypick.config;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseUrlEnvironmentTest {

    @Test
    void convertsRailwayStyleUrl() {
        Map<String, Object> p = DatabaseUrlEnvironment.toDataSourceProperties(
                "postgresql://postgres:s3cr%40t@postgres.railway.internal:5432/railway");
        assertThat(p).containsEntry("spring.datasource.url", "jdbc:postgresql://postgres.railway.internal:5432/railway")
                .containsEntry("spring.datasource.username", "postgres")
                .containsEntry("spring.datasource.password", "s3cr@t");
    }

    @Test
    void keepsQueryAndDefaultsPort() {
        Map<String, Object> p = DatabaseUrlEnvironment.toDataSourceProperties("postgres://u:p@db.example.com/app?sslmode=require");
        assertThat(p).containsEntry("spring.datasource.url", "jdbc:postgresql://db.example.com:5432/app?sslmode=require");
    }

    @Test
    void ignoresNonPostgresAndEmptyHost() {
        assertThat(DatabaseUrlEnvironment.toDataSourceProperties("mysql://u:p@h/db")).isEmpty();
        assertThat(DatabaseUrlEnvironment.toDataSourceProperties("postgresql://:@:/")).isEmpty();
    }
}
