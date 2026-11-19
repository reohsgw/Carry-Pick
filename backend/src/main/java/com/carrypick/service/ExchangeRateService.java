package com.carrypick.service;

import com.carrypick.config.AppProperties;
import com.carrypick.domain.Countries;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/**
 * Won value of one unit of each foreign currency ("1 JPY = ₩9.2").
 * Today's rates come from a free public source (open.er-api.com, no key) and are cached for a few hours.
 * If that source can't be reached, the fixed rates in app.fx are used, so the app keeps working offline.
 */
@Service
public class ExchangeRateService {
    private static final Logger log = LoggerFactory.getLogger(ExchangeRateService.class);
    private static final String SOURCE = "https://open.er-api.com/v6/latest/KRW";
    private static final Duration REFRESH = Duration.ofHours(6);
    private static final Duration RETRY_AFTER_FAILURE = Duration.ofMinutes(10);

    /** krwPerUnit: currency code to won per one unit. live: false when these are the fixed fallback rates. */
    public record Rates(Map<String, Double> krwPerUnit, boolean live, Instant updatedAt) {}

    private final Map<String, Double> fixed;
    private final boolean liveEnabled;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

    private volatile Rates cached;
    private volatile Instant fetchedAt = Instant.EPOCH;
    private volatile Instant lastAttempt = Instant.EPOCH;

    @Autowired
    public ExchangeRateService(AppProperties props, ObjectMapper json, @Value("${app.fx-live:true}") boolean liveEnabled) {
        this(props.fx(), json, liveEnabled);
    }

    public ExchangeRateService(Map<String, Double> fixed, ObjectMapper json, boolean liveEnabled) {
        this.fixed = fixed == null ? Map.of("KRW", 1.0) : Map.copyOf(fixed);
        this.json = json;
        this.liveEnabled = liveEnabled;
    }

    /** Fixed rates only, never calling out (tests, offline). */
    public static ExchangeRateService fixedOnly(Map<String, Double> fixed) {
        return new ExchangeRateService(fixed, new ObjectMapper(), false);
    }

    public Rates rates() {
        Rates now = cached;
        if (!liveEnabled) return fixedRates();
        boolean fresh = now != null && fetchedAt.isAfter(Instant.now().minus(REFRESH));
        if (fresh) return now;
        if (Instant.now().isBefore(lastAttempt.plus(RETRY_AFTER_FAILURE))) return now != null ? now : fixedRates();
        synchronized (this) {
            if (cached != null && cached != now) return cached;
            lastAttempt = Instant.now();
            Rates fetched = fetch();
            if (fetched != null) { cached = fetched; fetchedAt = Instant.now(); }
            return cached != null ? cached : fixedRates();
        }
    }

    /** Won per one unit of the currency, or null when there is no rate for it. */
    public Double krwPerUnit(String currency) {
        if (currency == null) return null;
        return rates().krwPerUnit().get(currency.toUpperCase());
    }

    private Rates fixedRates() {
        return new Rates(fixed, false, null);
    }

    private Set<String> wanted() {
        Set<String> codes = new TreeSet<>(fixed.keySet());
        Countries.ALL.forEach(c -> codes.add(c.currency()));
        codes.add("KRW");
        return codes;
    }

    private Rates fetch() {
        try {
            HttpRequest req = HttpRequest.newBuilder(URI.create(SOURCE)).timeout(Duration.ofSeconds(4)).GET().build();
            HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode body = json.readTree(res.body());
            if (res.statusCode() != 200 || !"success".equals(body.path("result").asText())) {
                log.warn("Exchange rates unavailable (HTTP {}); using fixed rates", res.statusCode());
                return null;
            }
            // The source gives units per 1 KRW; we store won per 1 unit.
            JsonNode perKrw = body.path("rates");
            Map<String, Double> out = new LinkedHashMap<>();
            for (String code : wanted()) {
                double unitsPerKrw = perKrw.path(code).asDouble(0);
                if (unitsPerKrw > 0) out.put(code, Math.round(10_000.0 / unitsPerKrw) / 10_000.0);
                else if (fixed.containsKey(code)) out.put(code, fixed.get(code));
            }
            out.put("KRW", 1.0);
            long unix = body.path("time_last_update_unix").asLong(0);
            log.info("Exchange rates updated from {} ({} currencies)", SOURCE, out.size());
            return new Rates(Map.copyOf(out), true, unix > 0 ? Instant.ofEpochSecond(unix) : Instant.now());
        } catch (Exception e) {
            if (e instanceof InterruptedException) Thread.currentThread().interrupt();
            log.warn("Could not fetch exchange rates ({}); using fixed rates", e.toString());
            return null;
        }
    }
}
