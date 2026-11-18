package com.carrypick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

/**
 * One-time wipe switch for the hosted database. Set RESET_DATABASE=true on the server and restart:
 * every table is emptied before {@link DataSeeder} (order 1) runs, so only the demo data is created again.
 * Remove the variable afterwards, otherwise every restart wipes the data. Off by default.
 */
@Component
@Order(0)
public class DatabaseReset implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(DatabaseReset.class);

    private final DataSource dataSource;
    private final boolean enabled;

    public DatabaseReset(DataSource dataSource, @Value("${RESET_DATABASE:false}") boolean enabled) {
        this.dataSource = dataSource;
        this.enabled = enabled;
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) return;
        try (Connection c = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(c.getMetaData().getDatabaseProductName())) {
                log.warn("RESET_DATABASE is set, but this database is not PostgreSQL; nothing was wiped.");
                return;
            }
        }
        JdbcTemplate jdbc = new JdbcTemplate(dataSource);
        List<String> tables = jdbc.queryForList(
                "SELECT format('%I', tablename) FROM pg_tables WHERE schemaname = current_schema()", String.class);
        if (tables.isEmpty()) return;
        jdbc.execute("TRUNCATE TABLE " + String.join(", ", tables) + " RESTART IDENTITY CASCADE");
        log.warn("RESET_DATABASE=true: emptied {} tables. Demo data will be created again. "
                + "Remove RESET_DATABASE now, or the next restart will wipe everything again.", tables.size());
    }
}
