package com.carrypick.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Lets the API use the DATABASE_URL that hosts such as Railway, Render and Heroku provide
 * (postgresql://user:password@host:port/db). Java needs jdbc:postgresql://host:port/db with the
 * user and password given separately, so this converts it at startup.
 * An explicit DB_URL still wins; without DATABASE_URL nothing changes (local H2 keeps working).
 */
public class DatabaseUrlEnvironment implements EnvironmentPostProcessor {

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String databaseUrl = env.getProperty("DATABASE_URL");
        if (isBlank(databaseUrl) || !isBlank(env.getProperty("DB_URL"))) return;
        Map<String, Object> props = toDataSourceProperties(databaseUrl);
        if (props.isEmpty()) return;
        // A real database must keep its data between restarts (the default H2 profile drops it).
        props.put("spring.jpa.hibernate.ddl-auto", "update");
        env.getPropertySources().addFirst(new MapPropertySource("databaseUrl", props));
    }

    /** postgres(ql)://user:pass@host:port/db?params → Spring datasource properties; empty if not a Postgres URL. */
    static Map<String, Object> toDataSourceProperties(String databaseUrl) {
        Map<String, Object> props = new LinkedHashMap<>();
        String url = databaseUrl.trim();
        if (!url.startsWith("postgres://") && !url.startsWith("postgresql://")) return props;
        URI uri = URI.create(url);
        if (isBlank(uri.getHost())) return props;
        int port = uri.getPort() > 0 ? uri.getPort() : 5432;
        String query = uri.getRawQuery() == null ? "" : "?" + uri.getRawQuery();
        props.put("spring.datasource.url", "jdbc:postgresql://" + uri.getHost() + ":" + port + uri.getRawPath() + query);
        String userInfo = uri.getRawUserInfo();
        if (userInfo != null) {
            int colon = userInfo.indexOf(':');
            props.put("spring.datasource.username", decode(colon < 0 ? userInfo : userInfo.substring(0, colon)));
            if (colon >= 0) props.put("spring.datasource.password", decode(userInfo.substring(colon + 1)));
        }
        return props;
    }

    private static String decode(String s) {
        return URLDecoder.decode(s, StandardCharsets.UTF_8);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
