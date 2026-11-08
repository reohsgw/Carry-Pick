package com.carrypick.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String corsOrigins,
        Jwt jwt,
        String uploadDir,
        boolean seedDemoData,
        Pricing pricing,
        Payment payment,
        Ai ai,
        java.util.Map<String, Double> fx
) {
    /**
     * AI receipt reader. provider = "mock" (sample result, no key), "anthropic" (Claude vision)
     * or "gemini" (Google Gemini vision, has a free tier).
     */
    public record Ai(String provider, String apiKey, String model, String apiUrl,
                     String geminiApiKey, String geminiModel, String geminiApiUrl) {
        public boolean isAnthropic() {
            return "anthropic".equalsIgnoreCase(provider) && apiKey != null && !apiKey.isBlank();
        }

        public boolean isGemini() {
            return "gemini".equalsIgnoreCase(provider) && geminiApiKey != null && !geminiApiKey.isBlank();
        }

        public boolean isMock() {
            return !isAnthropic() && !isGemini();
        }
    }

    public record Jwt(String secret, int ttlHours) {}

    public record Pricing(double feeRate, long taxThresholdKrw, double taxRate) {}

    public record Payment(String mode, String tossClientKey, String tossSecretKey, String tossConfirmUrl) {
        public boolean isMock() {
            return mode == null || !mode.equalsIgnoreCase("toss");
        }
    }
}
