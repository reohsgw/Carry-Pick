package com.carrypick.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.sql.Connection;
import java.util.List;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class EnumCheckCleaner implements ApplicationRunner {
    private static final Logger log = LoggerFactory.getLogger(EnumCheckCleaner.class);

    private final DataSource dataSource;
    private final JdbcTemplate jdbc;

    public EnumCheckCleaner(DataSource dataSource) {
        this.dataSource = dataSource;
        this.jdbc = new JdbcTemplate(dataSource);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        try (Connection c = dataSource.getConnection()) {
            if (!"PostgreSQL".equalsIgnoreCase(c.getMetaData().getDatabaseProductName())) return;
        }
        List<String> drops = jdbc.queryForList("""
                SELECT format('ALTER TABLE %s DROP CONSTRAINT %I', con.conrelid::regclass, con.conname)
                FROM pg_constraint con
                JOIN pg_namespace n ON n.oid = con.connamespace
                WHERE con.contype = 'c'
                  AND n.nspname = current_schema()
                  AND pg_get_constraintdef(con.oid) LIKE '%ARRAY[%'
                """, String.class);
        for (String sql : drops) {
            jdbc.execute(sql);
            log.info("Dropped stale enum check: {}", sql);
        }
    }
}
