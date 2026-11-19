package com.carrypick.web.dto;

import com.carrypick.domain.Mode;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

public final class Forms {
        private Forms() {
        }

        public record SignupForm(
                        @NotBlank @Email String email,
                        @NotBlank @Size(min = 8, max = 72) String password,
                        @NotBlank @Size(max = 40) String name,
                        Mode mode) {
        }

        public record LoginForm(@NotBlank String email, @NotBlank String password) {
        }

        public record UpdateMeForm(@Size(max = 40) String name, Mode mode, @Size(max = 200) String avatarUrl,
                        @Size(max = 30) String payoutBank,
                        @Size(max = 30) String payoutAccount,
                        @Size(max = 40) String payoutHolder) {
        }

        public record TripForm(
                        @NotBlank @Size(min = 2, max = 2) String countryCode,
                        @Size(max = 60) String city,
                        @NotNull LocalDate departDate,
                        @NotNull LocalDate returnDate,
                        @Size(max = 500) String luggageNote) {
        }

        public record OfferForm(
                        @NotNull Long tripId,
                        @NotBlank @Size(max = 120) String productName,
                        @Size(max = 80) String store,
                        @Size(max = 40) String category,
                        @Size(max = 1000) String description,
                        @Size(max = 500) String imageUrl,
                        /**
                         * Price in won. Optional when the price is given in the trip country's currency
                         * (priceLocal).
                         */
                        @Positive Long estPrice,
                        @PositiveOrZero long reward,
                        @Min(1) @Max(99) int quantity,
                        @Size(max = 500) String receiptUrl,
                        Long productId,
                        @Min(1) @Max(50000) Integer weightGrams,
                        /** Price per item in the trip country's currency, e.g. 1500 (JPY). */
                        @Positive @Digits(integer = 13, fraction = 2) java.math.BigDecimal priceLocal,
                        @Size(max = 3) String priceCurrency) {
        }

        public record RequestForm(
                        @NotBlank @Size(min = 2, max = 2) String countryCode,
                        @NotBlank @Size(max = 120) String productName,
                        @Size(max = 1000) String productLink,
                        @Size(max = 500) String imageUrl,
                        @Size(max = 200) String options,
                        @Size(max = 1000) String note,
                        /**
                         * Max budget in won. Optional when the budget is given in the country's
                         * currency (budgetLocal).
                         */
                        @Positive Long maxBudget,
                        @PositiveOrZero long reward,
                        @NotNull LocalDate deadline,
                        Long productId,
                        @Min(1) @Max(50000) Integer weightGrams,
                        /**
                         * Max budget in the currency of the country the item is bought in, e.g. 3000
                         * (JPY).
                         */
                        @Positive @Digits(integer = 13, fraction = 2) java.math.BigDecimal budgetLocal,
                        @Size(max = 3) String budgetCurrency) {
        }

        public record ProductForm(
                        @NotBlank @Size(max = 120) String name,
                        @Size(max = 120) String nameKo,
                        @Size(max = 120) String nameLocal,
                        @Size(max = 500) String aliases,
                        @Size(max = 40) String category,
                        @Size(max = 3) String countryCode) {
        }

        public record BookForm(@NotNull Long offerId, @Min(1) @Max(99) int quantity) {
        }

        public record AcceptForm(Long tripId) {
        }

        public record RejectForm(boolean reopenRequest) {
        }

        public record CancelForm(@Size(max = 200) String reason) {
        }

        /**
         * RECEIVED (buyer: it arrived after all), REFUND (traveler: cancel and refund),
         * WITHDRAW (reporter takes the report back).
         */
        public record ResolveForm(@NotBlank String action) {
        }

        public record MessageForm(@Size(max = 1000) String text, @Size(max = 500) String imageUrl) {
        }

        public record PrepareForm(@NotNull Long orderId) {
        }

        public record ConfirmForm(@NotBlank String paymentKey, @NotBlank String tossOrderId, @Positive long amount) {
        }

        public record FailForm(@NotBlank String tossOrderId, String code, String message) {
        }
}
