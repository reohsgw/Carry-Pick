package com.carrypick;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.payment.mode=mock", "app.fx-live=false"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class RequestBudgetCurrencyTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void budgetInYen_isConvertedToWonOnTheServer() throws Exception {
        String minji = login("buyer@carrypick.test");
        String deadline = LocalDate.now().plusDays(10).toString();

        JsonNode r = body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"Matcha KitKat","budgetLocal":3000,"budgetCurrency":"JPY",
                 "reward":5000,"deadline":"%s","weightGrams":200}
                """.formatted(deadline)), 201);
        assertThat(r.get("budgetCurrency").asText()).isEqualTo("JPY");
        assertThat(r.get("budgetLocal").asInt()).isEqualTo(3000);
        assertThat(r.get("fxRate").asDouble()).isEqualTo(9.2);
        assertThat(r.get("maxBudget").asLong()).isEqualTo(27600);

        JsonNode usd = body(send(post("/api/requests"), minji, """
                {"countryCode":"US","productName":"Tote","budgetLocal":25.50,"budgetCurrency":"USD",
                 "reward":5000,"deadline":"%s"}
                """.formatted(deadline)), 201);
        assertThat(usd.get("maxBudget").asLong()).isEqualTo(35190);

        JsonNode wrong = body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","budgetLocal":3000,"budgetCurrency":"USD","reward":0,"deadline":"%s"}
                """.formatted(deadline)), 400);
        assertThat(wrong.get("code").asText()).isEqualTo("BUDGET_CURRENCY");

        body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","budgetLocal":3000,"budgetCurrency":"JPY","reward":20000,"deadline":"%s"}
                """.formatted(deadline)), 400);

        JsonNode won = body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","maxBudget":30000,"reward":5000,"deadline":"%s"}
                """.formatted(deadline)), 201);
        assertThat(won.get("maxBudget").asLong()).isEqualTo(30000);
        assertThat(won.get("budgetCurrency").asText()).isEqualTo("JPY");
        assertThat(won.get("budgetLocal").asDouble()).isEqualTo(3260.87);

        JsonNode rates = body(get("/api/fx").header("Authorization", "Bearer " + minji), 200);
        assertThat(rates.get("krwPerUnit").get("JPY").asDouble()).isEqualTo(9.2);
        assertThat(rates.get("live").asBoolean()).isFalse();
    }

    @Test
    void yenLimit_isCheckedInYen_extraUsesTheLockedRate() throws Exception {
        String minji = login("buyer@carrypick.test");
        String kenji = login("traveler@carrypick.test");
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        body(send(post("/api/trips"), kenji, """
                {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                """.formatted(today.plusDays(2), today.plusDays(6))), 201);

        long okId = request(minji, today);
        long overId = request(minji, today);

        long okOrder = acceptAndPay(kenji, minji, okId);
        JsonNode order = body(get("/api/orders/" + okOrder).header("Authorization", "Bearer " + kenji), 200);
        assertThat(order.get("currency").asText()).isEqualTo("JPY");
        assertThat(order.get("limitLocal").asInt()).isEqualTo(1500);
        assertThat(order.get("fxRate").asDouble()).isEqualTo(9.2);
        JsonNode bought = body(purchase(kenji, okOrder, "actualLocal", "1500"), 200);
        assertThat(bought.get("actualLocal").asInt()).isEqualTo(1500);
        assertThat(bought.get("actualPrice").asLong()).isEqualTo(13800);

        long wonOrder = acceptAndPay(kenji, minji, request(minji, today));
        JsonNode wonBought = body(purchase(kenji, wonOrder, "actualPrice", "13800"), 200);
        assertThat(wonBought.get("actualLocal").asInt()).isEqualTo(1500);
        assertThat(wonBought.get("actualPrice").asLong()).isEqualTo(13800);
        long wonOver = acceptAndPay(kenji, minji, request(minji, today));
        body(purchase(kenji, wonOver, "actualPrice", "14720"), 409);

        long overOrder = acceptAndPay(kenji, minji, overId);
        body(purchase(kenji, overOrder, "actualLocal", "1600"), 409);
        JsonNode checked = body(multipart("/api/orders/" + overOrder + "/price-check")
                .file(new org.springframework.mock.web.MockMultipartFile("photo", "tag.png", "image/png", new byte[]{1, 2, 3}))
                .param("priceLocal", "1600").header("Authorization", "Bearer " + kenji), 200);
        assertThat(checked.get("extraItemAmount").asLong()).isEqualTo(920);
        assertThat(checked.get("quotedPrice").asLong()).isEqualTo(13800 + 920);
        assertThat(checked.get("quotedLocal").asInt()).isEqualTo(1600);
    }

    @Test
    void productPricedInYen_ordersLockThatYenPrice() throws Exception {
        String minji = login("buyer@carrypick.test");
        String kenji = login("traveler@carrypick.test");
        LocalDate today = LocalDate.now(java.time.ZoneId.of("Asia/Seoul"));
        long tripId = body(send(post("/api/trips"), kenji, """
                {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                """.formatted(today.plusDays(2), today.plusDays(6))), 201).get("id").asLong();

        JsonNode offer = body(send(post("/api/offers"), kenji, """
                {"tripId":%d,"productName":"Matcha","priceLocal":1500,"priceCurrency":"JPY","reward":3000,"quantity":3,"weightGrams":200}
                """.formatted(tripId)), 201);
        assertThat(offer.get("priceLocal").asInt()).isEqualTo(1500);
        assertThat(offer.get("priceCurrency").asText()).isEqualTo("JPY");
        assertThat(offer.get("estPrice").asLong()).isEqualTo(13800);

        JsonNode wonOffer = body(send(post("/api/offers"), kenji, """
                {"tripId":%d,"productName":"Pocky","estPrice":9200,"reward":2000,"quantity":2,"weightGrams":100}
                """.formatted(tripId)), 201);
        assertThat(wonOffer.get("priceCurrency").asText()).isEqualTo("JPY");
        assertThat(wonOffer.get("priceLocal").asInt()).isEqualTo(1000);
        assertThat(wonOffer.get("estPrice").asLong()).isEqualTo(9200);

        body(send(post("/api/offers"), kenji, """
                {"tripId":%d,"productName":"x","priceLocal":10,"priceCurrency":"USD","reward":0,"quantity":1}
                """.formatted(tripId)), 400);

        long orderId = body(send(post("/api/orders"), minji, "{\"offerId\":" + offer.get("id").asLong() + ",\"quantity\":2}"), 201)
                .get("id").asLong();
        JsonNode order = body(get("/api/orders/" + orderId).header("Authorization", "Bearer " + minji), 200);
        assertThat(order.get("limitLocal").asInt()).isEqualTo(3000);
        assertThat(order.get("budget").asLong()).isEqualTo(27600);

        JsonNode prep = body(send(post("/api/payments/prepare"), minji, "{\"orderId\":" + orderId + "}"), 200);
        body(send(post("/api/payments/confirm"), minji, """
                {"paymentKey":"mock_ok_p%d","tossOrderId":"%s","amount":%d}
                """.formatted(orderId, prep.get("tossOrderId").asText(), prep.get("amount").asLong())), 200);
        JsonNode bought = body(purchase(kenji, orderId, "actualLocal", "3000"), 200);
        assertThat(bought.get("actualPrice").asLong()).isEqualTo(27600);
    }

    private long request(String buyer, LocalDate today) throws Exception {
        return body(send(post("/api/requests"), buyer, """
                {"countryCode":"JP","productName":"Hair treatment","budgetLocal":1500,"budgetCurrency":"JPY",
                 "reward":3000,"deadline":"%s","weightGrams":200}
                """.formatted(today.plusDays(10))), 201).get("id").asLong();
    }

    private long acceptAndPay(String traveler, String buyer, long requestId) throws Exception {
        long orderId = body(post("/api/requests/" + requestId + "/accept").header("Authorization", "Bearer " + traveler), 201)
                .get("id").asLong();
        JsonNode prep = body(send(post("/api/payments/prepare"), buyer, "{\"orderId\":" + orderId + "}"), 200);
        body(send(post("/api/payments/confirm"), buyer, """
                {"paymentKey":"mock_ok_%d","tossOrderId":"%s","amount":%d}
                """.formatted(orderId, prep.get("tossOrderId").asText(), prep.get("amount").asLong())), 200);
        return orderId;
    }

    private RequestBuilder purchase(String token, long orderId, String param, String value) {
        return multipart("/api/orders/" + orderId + "/purchase")
                .file(new org.springframework.mock.web.MockMultipartFile("receipt", "r.png", "image/png", new byte[]{1, 2, 3}))
                .param(param, value).header("Authorization", "Bearer " + token);
    }

    private RequestBuilder send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder req, String token, String body) {
        return req.header("Authorization", "Bearer " + token).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private String login(String email) throws Exception {
        return body(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"carrypick123\"}"), 200).get("token").asText();
    }

    private JsonNode body(RequestBuilder req, int expected) throws Exception {
        String text = mvc.perform(req).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return text.isBlank() ? json.createObjectNode() : json.readTree(text);
    }
}
