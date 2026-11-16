package com.carrypick;

import com.carrypick.domain.ProductNames;
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
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.payment.mode=mock", "app.upload-dir=target/test-uploads"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class ProductCatalogTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void namesAreMatchedIgnoringCaseSpacesAndPunctuation() {
        assertThat(ProductNames.normalize("Tokyo Banana (8 pcs)")).isEqualTo("tokyobanana8pcs");
        assertThat(ProductNames.normalize("TOKYO-banana 8pcs")).isEqualTo("tokyobanana8pcs");
        assertThat(ProductNames.normalize("도쿄 바나나")).isEqualTo("도쿄바나나");
        assertThat(ProductNames.normalize("ＡＮＥＳＳＡ")).isEqualTo("anessa");
    }

    @Test
    void searchFindsProductsByTheirNameInAnyLanguage() throws Exception {
        String buyer = login("buyer@carrypick.test");
        assertThat(offerNames(buyer, "도쿄바나나")).contains("Tokyo Banana (8 pcs)");
        assertThat(offerNames(buyer, "東京ばな奈")).contains("Tokyo Banana (8 pcs)");
        assertThat(offerNames(buyer, "tokyo banana 8pcs")).contains("Tokyo Banana (8 pcs)");
        assertThat(offerNames(buyer, "선크림")).contains("Anessa Perfect UV Sunscreen 60ml");
        assertThat(offerNames(buyer, "마카롱")).contains("Ladurée macarons (box of 12)");
        JsonNode picks = body(get("/api/products").param("q", "로이스").header("Authorization", "Bearer " + buyer), 200);
        assertThat(picks.get(0).get("name").asText()).isEqualTo("Royce' Nama Chocolate");
        assertThat(picks.get(0).get("nameKo").asText()).isEqualTo("로이스 생초콜릿");
    }

    @Test
    void sameProductPostedUnderAnotherName_countsTogetherInTheRanking() throws Exception {
        String buyer = login("buyer@carrypick.test");
        String traveler2 = login("traveler2@carrypick.test");

        long before = rankingCount(buyer, "JP", "Tokyo Banana (8 pcs)");
        assertThat(before).isGreaterThan(0);

        LocalDate depart = LocalDate.now().plusDays(5);
        JsonNode trip = body(post("/api/trips").header("Authorization", "Bearer " + traveler2)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"countryCode":"JP","city":"Tokyo","departDate":"%s","returnDate":"%s"}
                        """.formatted(depart, depart.plusDays(4))), 201);
        JsonNode offer = body(post("/api/offers").header("Authorization", "Bearer " + traveler2)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"tripId":%d,"productName":"도쿄 바나나 (8개입)","category":"Snacks","estPrice":12000,"reward":4000,"quantity":3}
                        """.formatted(trip.get("id").asLong())), 201);
        assertThat(offer.get("product").get("name").asText()).isEqualTo("Tokyo Banana (8 pcs)");

        JsonNode order = body(post("/api/orders").header("Authorization", "Bearer " + buyer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"offerId\":" + offer.get("id").asLong() + ",\"quantity\":1}"), 201);
        JsonNode prep = body(post("/api/payments/prepare").header("Authorization", "Bearer " + buyer)
                .contentType(MediaType.APPLICATION_JSON).content("{\"orderId\":" + order.get("id").asLong() + "}"), 200);
        body(post("/api/payments/confirm").header("Authorization", "Bearer " + buyer)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"paymentKey":"mock_ok_x","tossOrderId":"%s","amount":%d}
                        """.formatted(prep.get("tossOrderId").asText(), prep.get("amount").asLong())), 200);

        JsonNode ranking = body(get("/api/countries/JP/ranking").header("Authorization", "Bearer " + buyer), 200);
        List<String> names = new ArrayList<>();
        ranking.get("items").forEach(i -> names.add(i.get("productName").asText()));
        assertThat(names).doesNotContain("도쿄 바나나 (8개입)");
        assertThat(rankingCount(buyer, "JP", "Tokyo Banana (8 pcs)")).isEqualTo(before + 1);
    }

    @Test
    void addingAProductThatAlreadyExistsReturnsTheExistingOne() throws Exception {
        String traveler = login("traveler@carrypick.test");
        JsonNode created = body(post("/api/products").header("Authorization", "Bearer " + traveler)
                .contentType(MediaType.APPLICATION_JSON).content("""
                        {"name":"Shiroi Koibito (12 pcs)","nameKo":"시로이 코이비토","nameLocal":"白い恋人","aliases":"시로이연인, 하얀연인","category":"Snacks","countryCode":"JP"}
                        """), 200);
        JsonNode again = body(post("/api/products").header("Authorization", "Bearer " + traveler)
                .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"白い恋人\"}"), 200);
        assertThat(again.get("id").asLong()).isEqualTo(created.get("id").asLong());
        JsonNode found = body(get("/api/products").param("q", "하얀연인").header("Authorization", "Bearer " + traveler), 200);
        assertThat(found.get(0).get("id").asLong()).isEqualTo(created.get("id").asLong());
    }

    private List<String> offerNames(String token, String q) throws Exception {
        JsonNode res = body(get("/api/search").param("q", q).header("Authorization", "Bearer " + token), 200);
        List<String> names = new ArrayList<>();
        res.get("offers").forEach(o -> names.add(o.get("productName").asText()));
        return names;
    }

    private long rankingCount(String token, String country, String name) throws Exception {
        JsonNode ranking = body(get("/api/countries/" + country + "/ranking").header("Authorization", "Bearer " + token), 200);
        for (JsonNode i : ranking.get("items")) if (i.get("productName").asText().equals(name)) return i.get("orderCount").asLong();
        return 0;
    }

    private String login(String email) throws Exception {
        return body(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"carrypick123\"}"), 200).get("token").asText();
    }

    private JsonNode body(RequestBuilder request, int expectedStatus) throws Exception {
        String s = mvc.perform(request).andExpect(status().is(expectedStatus)).andReturn().getResponse().getContentAsString();
        return s.isEmpty() ? json.createObjectNode() : json.readTree(s);
    }
}
