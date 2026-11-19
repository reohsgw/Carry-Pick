package com.carrypick;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.payment.mode=mock", "app.upload-dir=target/test-uploads"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class OrderFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired com.carrypick.service.OrderService orderService;

    private static final String PW = "carrypick123";

    @Test
    void flowA_bookOffer_happyPath() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");

        long offerId = firstBookableOffer("JP");
        JsonNode order = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201);
        long orderId = order.get("id").asLong();
        assertThat(order.get("status").asText()).isEqualTo("PENDING_PAYMENT");

        pay(buyer, orderId, "mock_ok_1");
        assertStatus(buyer, orderId, "PAID");

        long budget = order.get("budget").asLong();
        purchase(traveler, orderId, budget - 1000);
        assertStatus(buyer, orderId, "PURCHASED");

        deliver(traveler, orderId);
        JsonNode done = body(post("/api/orders/" + orderId + "/confirm", buyer, null), 200);
        assertThat(done.get("status").asText()).isEqualTo("SETTLED");
        assertThat(done.get("settlement").get("buyerRefund").asLong()).isEqualTo(1000);
        assertThat(done.get("settlement").get("travelerPayout").asLong())
                .isEqualTo(budget - 1000 + order.get("reward").asLong());
    }

    @Test
    void flowB_requestAccepted_priceCheckApprovedBeforePurchase() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        kenjiJapanTrip(traveler);

        String deadline = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(30).toString();
        JsonNode req = body(post("/api/requests", buyer, """
                {"countryCode":"JP","productName":"Test matcha set","maxBudget":30000,"reward":5000,"deadline":"%s"}
                """.formatted(deadline)), 201);
        long requestId = req.get("id").asLong();

        JsonNode board = body(get("/api/requests/open").header("Authorization", "Bearer " + traveler), 200);
        assertThat(board.findValues("id").stream().anyMatch(n -> n.asLong() == requestId)).isTrue();

        JsonNode order = body(post("/api/requests/" + requestId + "/accept", traveler, null), 201);
        long orderId = order.get("id").asLong();
        pay(buyer, orderId, "mock_ok_2");

        purchaseExpect(traveler, orderId, 36000, 409);

        multipartOk(traveler, "/api/orders/" + orderId + "/price-check", "photo", "price", 36000);
        JsonNode waiting = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + buyer), 200);
        assertThat(waiting.get("status").asText()).isEqualTo("AWAITING_APPROVAL");
        assertThat(waiting.get("extraItemAmount").asLong()).isEqualTo(6000);
        assertThat(waiting.get("priceTagUrl").isNull()).isFalse();

        JsonNode extra = body(post("/api/orders/" + orderId + "/approve", buyer, null), 200);
        assertThat(extra.get("type").asText()).isEqualTo("EXTRA");
        assertThat(extra.get("amount").asLong()).isEqualTo(6000 + 600);
        confirm(buyer, extra.get("tossOrderId").asText(), extra.get("amount").asLong(), "mock_ok_3");
        JsonNode approved = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + traveler), 200);
        assertThat(approved.get("status").asText()).isEqualTo("PAID");
        assertThat(approved.get("itemLimit").asLong()).isEqualTo(36000);

        purchaseExpect(traveler, orderId, 37000, 409);
        purchase(traveler, orderId, 35000);
        assertStatus(buyer, orderId, "PURCHASED");

        deliver(traveler, orderId);
        JsonNode done = body(post("/api/orders/" + orderId + "/confirm", buyer, null), 200);
        assertThat(done.get("status").asText()).isEqualTo("SETTLED");
        assertThat(done.get("settlement").get("travelerPayout").asLong()).isEqualTo(35000 + 5000);
        assertThat(done.get("settlement").get("buyerRefund").asLong()).isEqualTo(1000 + 100);
    }

    @Test
    void alreadyBoughtOffer_isPurchasedOnPayment() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");

        java.time.LocalDate depart = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(10);
        long tripId = body(post("/api/trips", traveler, """
                {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                """.formatted(depart, depart.plusDays(5))), 201).get("id").asLong();
        JsonNode offer = body(post("/api/offers", traveler, """
                {"tripId":%d,"productName":"Bought matcha","category":"Snacks","estPrice":12000,"reward":3000,
                 "quantity":1,"receiptUrl":"/uploads/receipt-test.png"}
                """.formatted(tripId)), 201);
        assertThat(offer.get("receiptUrl").asText()).isEqualTo("/uploads/receipt-test.png");

        long orderId = body(post("/api/orders", buyer, "{\"offerId\":" + offer.get("id").asLong() + ",\"quantity\":1}"), 201)
                .get("id").asLong();
        pay(buyer, orderId, "mock_ok_bought");
        JsonNode o = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + buyer), 200);
        assertThat(o.get("status").asText()).isEqualTo("PURCHASED");
        assertThat(o.get("actualPrice").asLong()).isEqualTo(12000);
        assertThat(o.get("receiptUrl").asText()).isEqualTo("/uploads/receipt-test.png");
    }

    @Test
    void chatRoom_perOrder() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        String stranger = login("buyer2@carrypick.test");
        long offerId = firstBookableOffer("JP");
        long orderId = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201)
                .get("id").asLong();
        String room = "/api/orders/" + orderId + "/messages";

        body(post(room, buyer, "{\"text\":\"Could you get the green one?\"}"), 201);
        body(post(room, buyer, "{\"imageUrl\":\"/uploads/shelf.png\"}"), 201);
        mvc.perform(post(room, buyer, "{\"text\":\"   \"}")).andExpect(status().isBadRequest());

        JsonNode o = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + traveler), 200);
        assertThat(o.get("unreadMessages").asLong()).isEqualTo(2);
        JsonNode list = body(get(room).header("Authorization", "Bearer " + traveler), 200);
        assertThat(list.size()).isEqualTo(2);
        assertThat(list.get(0).get("text").asText()).isEqualTo("Could you get the green one?");
        assertThat(list.get(0).get("mine").asBoolean()).isFalse();
        o = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + traveler), 200);
        assertThat(o.get("unreadMessages").asLong()).isZero();
        body(post(room, traveler, "{\"text\":\"Sure!\"}"), 201);
        assertThat(body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + buyer), 200)
                .get("unreadMessages").asLong()).isEqualTo(1);

        JsonNode notes = body(get("/api/notifications").header("Authorization", "Bearer " + traveler), 200);
        long chatNotes = 0;
        for (JsonNode n : notes) if ("MESSAGE".equals(n.get("kind").asText()) && n.get("orderId").asLong() == orderId) chatNotes++;
        assertThat(chatNotes).isEqualTo(1);

        mvc.perform(get(room).header("Authorization", "Bearer " + stranger)).andExpect(status().isNotFound());
        mvc.perform(post(room, stranger, "{\"text\":\"hi\"}")).andExpect(status().isNotFound());
    }

    @Test
    void paymentFailure_thenRetrySucceeds() throws Exception {
        String buyer = login("buyer@carrypick.test");
        long offerId = firstBookableOffer("FR");
        long orderId = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201)
                .get("id").asLong();

        pay(buyer, orderId, "mock_fail_card");
        assertStatus(buyer, orderId, "PAYMENT_FAILED");

        pay(buyer, orderId, "mock_ok_retry");
        assertStatus(buyer, orderId, "PAID");
    }

    @Test
    void rejectHigherPrice_canReopenRequestForOtherTravelersOnly() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String kenji = login("traveler@carrypick.test");
        String linh = login("traveler2@carrypick.test");
        java.time.LocalDate today = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        kenjiJapanTrip(kenji);
        body(post("/api/trips", linh, """
                {"countryCode":"JP","city":"Kyoto","departDate":"%s","returnDate":"%s"}
                """.formatted(today.plusDays(3), today.plusDays(9))), 201);

        long reopened = rejectedRequest(buyer, kenji, today, "Reopen tea", true);
        JsonNode r1 = body(get("/api/requests/" + reopened).header("Authorization", "Bearer " + buyer), 200);
        assertThat(r1.get("status").asText()).isEqualTo("OPEN");
        assertThat(openIds(kenji)).doesNotContain(reopened);
        assertThat(openIds(linh)).contains(reopened);
        mvc.perform(post("/api/requests/" + reopened + "/accept", kenji, null)).andExpect(status().isConflict());
        body(post("/api/requests/" + reopened + "/accept", linh, null), 201);

        long closed = rejectedRequest(buyer, kenji, today, "Closed tea", false);
        assertThat(body(get("/api/requests/" + closed).header("Authorization", "Bearer " + buyer), 200).get("status").asText()).isEqualTo("CANCELLED");
        assertThat(openIds(linh)).doesNotContain(closed);
    }

    private long rejectedRequest(String buyer, String traveler, java.time.LocalDate today, String name, boolean reopen)
            throws Exception {
        long requestId = body(post("/api/requests", buyer, """
                {"countryCode":"JP","productName":"%s","maxBudget":30000,"reward":5000,"deadline":"%s"}
                """.formatted(name, today.plusDays(30))), 201).get("id").asLong();
        long orderId = body(post("/api/requests/" + requestId + "/accept", traveler, null), 201).get("id").asLong();
        pay(buyer, orderId, "mock_ok_reject_" + requestId);
        multipartOk(traveler, "/api/orders/" + orderId + "/price-check", "photo", "price", 36000);
        JsonNode rejected = body(post("/api/orders/" + orderId + "/reject", buyer, "{\"reopenRequest\":" + reopen + "}"), 200);
        assertThat(rejected.get("status").asText()).isEqualTo("CANCELLED");
        return requestId;
    }

    private java.util.List<Long> openIds(String token) throws Exception {
        JsonNode board = body(get("/api/requests/open").header("Authorization", "Bearer " + token), 200);
        java.util.List<Long> ids = new java.util.ArrayList<>();
        board.forEach(n -> ids.add(n.get("id").asLong()));
        return ids;
    }

    @Test
    void cancel_allowedUntilReceiptUploaded() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");

        long first = body(post("/api/orders", buyer, "{\"offerId\":" + firstBookableOffer("JP") + ",\"quantity\":1}"), 201)
                .get("id").asLong();
        pay(buyer, first, "mock_ok_cancel_1");
        JsonNode paid = body(get("/api/orders/" + first).header("Authorization", "Bearer " + buyer), 200);
        multipartOk(traveler, "/api/orders/" + first + "/price-check", "photo", "price", paid.get("budget").asLong() + 5000);
        assertStatus(buyer, first, "AWAITING_APPROVAL");
        JsonNode cancelled = body(post("/api/orders/" + first + "/cancel", buyer, null), 200);
        assertThat(cancelled.get("status").asText()).isEqualTo("CANCELLED");
        assertThat(cancelled.get("payments").findValuesAsText("type")).contains("REFUND");

        long second = body(post("/api/orders", buyer, "{\"offerId\":" + firstBookableOffer("JP") + ",\"quantity\":1}"), 201)
                .get("id").asLong();
        pay(buyer, second, "mock_ok_cancel_2");
        purchase(traveler, second, 1000);
        assertStatus(buyer, second, "PURCHASED");
        mvc.perform(post("/api/orders/" + second + "/cancel", buyer, null)).andExpect(status().isConflict());
        mvc.perform(post("/api/orders/" + second + "/cancel", traveler, null)).andExpect(status().isConflict());
    }

    @Test
    void securityRules() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        String otherBuyer = login("buyer2@carrypick.test");
        long offerId = firstBookableOffer("JP");
        long orderId = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201)
                .get("id").asLong();

        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + otherBuyer))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/payments/prepare", traveler, "{\"orderId\":" + orderId + "}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/orders/" + orderId + "/confirm", buyer, null))
                .andExpect(status().isConflict());
        JsonNode prep = body(post("/api/payments/prepare", buyer, "{\"orderId\":" + orderId + "}"), 200);
        mvc.perform(post("/api/payments/confirm", buyer, """
                        {"paymentKey":"mock_ok","tossOrderId":"%s","amount":%d}
                        """.formatted(prep.get("tossOrderId").asText(), prep.get("amount").asLong() - 1)))
                .andExpect(status().isBadRequest());
        mvc.perform(get("/api/orders/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void allCountries_offersAndRankingCoverEveryDestination() throws Exception {
        String buyer = login("buyer@carrypick.test");
        JsonNode jp = body(get("/api/offers?country=JP").header("Authorization", "Bearer " + buyer), 200);
        JsonNode all = body(get("/api/offers?country=ALL").header("Authorization", "Bearer " + buyer), 200);
        JsonNode none = body(get("/api/offers").header("Authorization", "Bearer " + buyer), 200);
        assertThat(all.size()).isGreaterThan(jp.size());
        assertThat(none.size()).isEqualTo(all.size());
        java.util.Set<String> countries = new java.util.HashSet<>();
        all.forEach(o -> countries.add(o.get("countryCode").asText()));
        assertThat(countries).contains("JP", "FR", "TH", "US");

        JsonNode ranking = body(get("/api/countries/ALL/ranking").header("Authorization", "Bearer " + buyer), 200);
        assertThat(ranking.get("countryCode").asText()).isEqualTo("ALL");
        assertThat(ranking.get("items").get(0).get("productName").asText()).startsWith("Tokyo Banana");
        java.util.List<String> names = new java.util.ArrayList<>();
        ranking.get("items").forEach(i -> names.add(i.get("productName").asText()));
        assertThat(names).anyMatch(n -> n.startsWith("Ladur"));
    }

    private String login(String email) throws Exception {
        JsonNode res = body(post("/api/auth/login", null,
                "{\"email\":\"" + email + "\",\"password\":\"" + PW + "\"}"), 200);
        return res.get("token").asText();
    }

    /**
     * A bookable offer in the country. Japan offers are always Kenji's, created fresh for the test, so flows
     * where the traveler buys and hands over don't depend on how the demo data is arranged.
     */
    private long firstBookableOffer(String country) throws Exception {
        if ("JP".equals(country)) return kenjiOffer(null);
        JsonNode list = body(get("/api/offers").param("country", country), 200);
        for (JsonNode o : list) {
            if (o.get("bookable").asBoolean()) return o.get("id").asLong();
        }
        throw new AssertionError("No bookable offer in " + country);
    }

    /** Kenji adds an upcoming Japan trip (the demo data has none), so he can accept Japan requests. */
    private void kenjiJapanTrip(String kenji) throws Exception {
        java.time.LocalDate depart = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(5);
        body(post("/api/trips", kenji, """
                {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                """.formatted(depart, depart.plusDays(5))), 201);
    }

    /** Kenji posts a new Japan trip and an offer on it; returns the offer id. */
    private long kenjiOffer(String receiptUrl) throws Exception {
        String kenji = login("traveler@carrypick.test");
        java.time.LocalDate depart = java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")).plusDays(10);
        long tripId = body(post("/api/trips", kenji, """
                {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                """.formatted(depart, depart.plusDays(5))), 201).get("id").asLong();
        return body(post("/api/offers", kenji, """
                {"tripId":%d,"productName":"Tokyo Banana (8 pcs)","category":"Food","estPrice":12000,"reward":4000,
                 "quantity":6,"weightGrams":300%s}
                """.formatted(tripId, receiptUrl == null ? "" : ",\"receiptUrl\":\"" + receiptUrl + "\"")), 201).get("id").asLong();
    }

    private void pay(String token, long orderId, String paymentKey) throws Exception {
        JsonNode prep = body(post("/api/payments/prepare", token, "{\"orderId\":" + orderId + "}"), 200);
        confirm(token, prep.get("tossOrderId").asText(), prep.get("amount").asLong(), paymentKey);
    }

    private void confirm(String token, String tossOrderId, long amount, String paymentKey) throws Exception {
        body(post("/api/payments/confirm", token, """
                {"paymentKey":"%s","tossOrderId":"%s","amount":%d}
                """.formatted(paymentKey, tossOrderId, amount)), 200);
    }

    private JsonNode deliver(String token, long orderId) throws Exception {
        MockMultipartFile proof = new MockMultipartFile("proof", "handover.png", "image/png", new byte[]{1, 2, 3});
        return body(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/orders/" + orderId + "/deliver").file(proof).param("method", "IN_PERSON")
                .header("Authorization", "Bearer " + token), 200);
    }

    private JsonNode report(String token, long orderId, String reason, int expected) throws Exception {
        return body(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/orders/" + orderId + "/report").param("reason", reason).param("note", "test")
                .header("Authorization", "Bearer " + token), expected);
    }

    @Test
    void handoverNeedsProof_thenBuyerReportsAndResolves() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        long offerId = firstBookableOffer("JP");
        JsonNode order = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201);
        long orderId = order.get("id").asLong();
        pay(buyer, orderId, "mock_ok_dispute");
        purchase(traveler, orderId, order.get("budget").asLong());

        // No photo, no hand-over.
        body(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .multipart("/api/orders/" + orderId + "/deliver")
                .header("Authorization", "Bearer " + traveler), 400);

        JsonNode delivered = deliver(traveler, orderId);
        assertThat(delivered.get("handoverPhotoUrl").asText()).startsWith("/uploads/");
        assertThat(delivered.get("autoConfirmAt").isNull()).isFalse();

        // A traveler reason doesn't fit the buyer.
        report(buyer, orderId, "NO_CONTACT", 400);
        JsonNode disputed = report(buyer, orderId, "NOT_RECEIVED", 200);
        assertThat(disputed.get("status").asText()).isEqualTo("DISPUTED");
        assertThat(disputed.get("dispute").get("byRole").asText()).isEqualTo("BUYER");
        assertThat(disputed.get("dispute").get("mine").asBoolean()).isTrue();

        // While disputed, the normal "received" button is blocked; resolving settles it.
        body(post("/api/orders/" + orderId + "/confirm", buyer, null), 409);
        body(post("/api/orders/" + orderId + "/resolve", traveler, "{\"action\":\"RECEIVED\"}"), 403);
        JsonNode done = body(post("/api/orders/" + orderId + "/resolve", buyer, "{\"action\":\"RECEIVED\"}"), 200);
        assertThat(done.get("status").asText()).isEqualTo("SETTLED");
    }

    @Test
    void buyerWhoNeverConfirms_isConfirmedAutomatically() throws Exception {
        org.springframework.test.util.ReflectionTestUtils.setField(orderService, "autoConfirmDays", 0);
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        long offerId = firstBookableOffer("JP");
        JsonNode order = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201);
        long orderId = order.get("id").asLong();
        pay(buyer, orderId, "mock_ok_auto");
        purchase(traveler, orderId, order.get("budget").asLong());
        deliver(traveler, orderId);

        orderService.autoConfirmDelivered();
        assertStatus(buyer, orderId, "SETTLED");
    }

    @Test
    void travelerReport_refundCancelsOrder() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        long offerId = firstBookableOffer("JP");
        JsonNode order = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201);
        long orderId = order.get("id").asLong();
        pay(buyer, orderId, "mock_ok_refund");
        purchase(traveler, orderId, order.get("budget").asLong());
        deliver(traveler, orderId);

        report(traveler, orderId, "NOT_CONFIRMING", 200);
        JsonNode withdrawn = body(post("/api/orders/" + orderId + "/resolve", traveler, "{\"action\":\"WITHDRAW\"}"), 200);
        assertThat(withdrawn.get("status").asText()).isEqualTo("DELIVERED");

        report(buyer, orderId, "WRONG_OR_DAMAGED", 200);
        body(post("/api/orders/" + orderId + "/resolve", traveler, "{\"action\":\"WITHDRAW\"}"), 403);
        JsonNode refunded = body(post("/api/orders/" + orderId + "/resolve", traveler, "{\"action\":\"REFUND\"}"), 200);
        assertThat(refunded.get("status").asText()).isEqualTo("CANCELLED");
    }

    private void purchase(String token, long orderId, long actualPrice) throws Exception {
        purchaseExpect(token, orderId, actualPrice, 200);
    }

    private void purchaseExpect(String token, long orderId, long actualPrice, int expected) throws Exception {
        multipart(token, "/api/orders/" + orderId + "/purchase", "receipt", "actualPrice", actualPrice, expected);
    }

    private void multipartOk(String token, String url, String filePart, String priceParam, long price) throws Exception {
        multipart(token, url, filePart, priceParam, price, 200);
    }

    private void multipart(String token, String url, String filePart, String priceParam, long price, int expected)
            throws Exception {
        MockMultipartFile file = new MockMultipartFile(filePart, "photo.png", "image/png", new byte[]{1, 2, 3});
        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart(url)
                        .file(file)
                        .param(priceParam, String.valueOf(price))
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().is(expected));
    }

    private void assertStatus(String token, long orderId, String expected) throws Exception {
        JsonNode o = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + token), 200);
        assertThat(o.get("status").asText()).isEqualTo(expected);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder post(
            String url, String token, String jsonBody) {
        var b = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(url)
                .contentType(MediaType.APPLICATION_JSON);
        if (token != null) b.header("Authorization", "Bearer " + token);
        if (jsonBody != null) b.content(jsonBody);
        return b;
    }

    private JsonNode body(org.springframework.test.web.servlet.RequestBuilder request, int expectedStatus)
            throws Exception {
        ResultActions r = mvc.perform(request).andExpect(status().is(expectedStatus));
        String s = r.andReturn().getResponse().getContentAsString();
        return s.isEmpty() ? json.createObjectNode() : json.readTree(s);
    }
}
