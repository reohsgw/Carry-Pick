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

/**
 * End-to-end checks of the two flows in the capstone plan, using the seeded demo accounts
 * and mock payment mode:
 *   Flow A: buyer books a traveler's offer -> pay -> purchase -> deliver -> confirm -> settled
 *   Flow B: buyer posts a request -> traveler accepts -> pay -> price check over budget -> approve + extra pay
 *           -> buy (a bit under the approved price) -> ... settled with the unspent part refunded
 *   Already bought: an offer listed with its receipt is PURCHASED as soon as the buyer pays
 * Plus: payment failure + retry, wrong-role access, and amount tampering.
 */
@SpringBootTest(properties = {"app.payment.mode=mock", "app.upload-dir=target/test-uploads"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class OrderFlowTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

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
        purchase(traveler, orderId, budget - 1000); // under budget
        assertStatus(buyer, orderId, "PURCHASED");

        body(post("/api/orders/" + orderId + "/deliver", traveler, null), 200);
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

        // Kenji (traveler) has a Tokyo trip returning in 17 days; deadline 30 days covers it.
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

        // Buying over the 30,000 budget without the buyer's approval is not allowed.
        purchaseExpect(traveler, orderId, 36000, 409);

        // Shelf price is 36,000: send the price tag before buying.
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

        // Still over the approved price: blocked. At 35,000 it goes through.
        purchaseExpect(traveler, orderId, 37000, 409);
        purchase(traveler, orderId, 35000);
        assertStatus(buyer, orderId, "PURCHASED");

        body(post("/api/orders/" + orderId + "/deliver", traveler, null), 200);
        JsonNode done = body(post("/api/orders/" + orderId + "/confirm", buyer, null), 200);
        assertThat(done.get("status").asText()).isEqualTo("SETTLED");
        assertThat(done.get("settlement").get("travelerPayout").asLong()).isEqualTo(35000 + 5000);
        // 1,000 unspent item money + the 100 of extra fee charged on it.
        assertThat(done.get("settlement").get("buyerRefund").asLong()).isEqualTo(1000 + 100);
    }

    @Test
    void alreadyBoughtOffer_isPurchasedOnPayment() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");

        JsonNode trips = body(get("/api/trips/me").header("Authorization", "Bearer " + traveler), 200);
        long tripId = -1;
        for (JsonNode tr : trips) {
            if (java.time.LocalDate.parse(tr.get("departDate").asText()).isAfter(java.time.LocalDate.now(java.time.ZoneId.of("Asia/Seoul")))) {
                tripId = tr.get("id").asLong();
                break;
            }
        }
        assertThat(tripId).isPositive();
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

        // The traveler sees 2 unread, reads them (which clears the count), and answers.
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

        // Only one unread chat notification per order, however many messages arrive.
        JsonNode notes = body(get("/api/notifications").header("Authorization", "Bearer " + traveler), 200);
        long chatNotes = 0;
        for (JsonNode n : notes) if ("MESSAGE".equals(n.get("kind").asText()) && n.get("orderId").asLong() == orderId) chatNotes++;
        assertThat(chatNotes).isEqualTo(1);

        // Nobody else can read or write.
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
    void securityRules() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler = login("traveler@carrypick.test");
        String otherBuyer = login("buyer2@carrypick.test");
        long offerId = firstBookableOffer("JP");
        long orderId = body(post("/api/orders", buyer, "{\"offerId\":" + offerId + ",\"quantity\":1}"), 201)
                .get("id").asLong();

        // A stranger cannot see the order.
        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + otherBuyer))
                .andExpect(status().isNotFound());
        // The traveler cannot pay or confirm for the buyer.
        mvc.perform(post("/api/payments/prepare", traveler, "{\"orderId\":" + orderId + "}"))
                .andExpect(status().isForbidden());
        // The buyer cannot skip ahead to "confirm received".
        mvc.perform(post("/api/orders/" + orderId + "/confirm", buyer, null))
                .andExpect(status().isConflict());
        // A tampered amount is rejected.
        JsonNode prep = body(post("/api/payments/prepare", buyer, "{\"orderId\":" + orderId + "}"), 200);
        mvc.perform(post("/api/payments/confirm", buyer, """
                        {"paymentKey":"mock_ok","tossOrderId":"%s","amount":%d}
                        """.formatted(prep.get("tossOrderId").asText(), prep.get("amount").asLong() - 1)))
                .andExpect(status().isBadRequest());
        // No token at all.
        mvc.perform(get("/api/orders/me")).andExpect(status().isUnauthorized());
    }

    // ------------------------------------------------------------------ helpers

    private String login(String email) throws Exception {
        JsonNode res = body(post("/api/auth/login", null,
                "{\"email\":\"" + email + "\",\"password\":\"" + PW + "\"}"), 200);
        return res.get("token").asText();
    }

    private long firstBookableOffer(String country) throws Exception {
        JsonNode list = body(get("/api/offers").param("country", country), 200);
        for (JsonNode o : list) {
            if (o.get("bookable").asBoolean()) return o.get("id").asLong();
        }
        throw new AssertionError("No bookable offer in " + country);
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
