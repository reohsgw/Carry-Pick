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

/** Buyers give the budget in the country's currency; the server converts it to won. Fixed rates: 1 JPY = ₩9.2. */
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

        // Decimals work for currencies like USD (fixed rate ₩1,380).
        JsonNode usd = body(send(post("/api/requests"), minji, """
                {"countryCode":"US","productName":"Tote","budgetLocal":25.50,"budgetCurrency":"USD",
                 "reward":5000,"deadline":"%s"}
                """.formatted(deadline)), 201);
        assertThat(usd.get("maxBudget").asLong()).isEqualTo(35190);

        // The currency must be the country's.
        JsonNode wrong = body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","budgetLocal":3000,"budgetCurrency":"USD","reward":0,"deadline":"%s"}
                """.formatted(deadline)), 400);
        assertThat(wrong.get("code").asText()).isEqualTo("BUDGET_CURRENCY");

        // The reward cap still applies to the won value: 50% of ₩27,600.
        body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","budgetLocal":3000,"budgetCurrency":"JPY","reward":20000,"deadline":"%s"}
                """.formatted(deadline)), 400);

        // Budgets in won still work.
        JsonNode won = body(send(post("/api/requests"), minji, """
                {"countryCode":"JP","productName":"x","maxBudget":30000,"reward":5000,"deadline":"%s"}
                """.formatted(deadline)), 201);
        assertThat(won.get("maxBudget").asLong()).isEqualTo(30000);
        assertThat(won.get("budgetCurrency").isNull()).isTrue();

        JsonNode rates = body(get("/api/fx").header("Authorization", "Bearer " + minji), 200);
        assertThat(rates.get("krwPerUnit").get("JPY").asDouble()).isEqualTo(9.2);
        assertThat(rates.get("live").asBoolean()).isFalse();
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
