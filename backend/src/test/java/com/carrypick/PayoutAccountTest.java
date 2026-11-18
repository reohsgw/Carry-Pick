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

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.payment.mode=mock"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class PayoutAccountTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void noAccount_cannotPostOffer_thenRegistersMaskedAccount() throws Exception {
        String minji = login("buyer@carrypick.test");

        JsonNode refused = body(post("/api/offers").header("Authorization", "Bearer " + minji)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"tripId\":1,\"productName\":\"x\",\"estPrice\":10000,\"reward\":1000,\"quantity\":1}"), 400);
        assertThat(refused.get("code").asText()).isEqualTo("PAYOUT_ACCOUNT_REQUIRED");

        JsonNode me = body(patchMe(minji, "{\"payoutBank\":\"카카오뱅크\",\"payoutAccount\":\"3333-01-2344321\",\"payoutHolder\":\"Minji\"}"), 200);
        assertThat(me.get("payout").get("bank").asText()).isEqualTo("카카오뱅크");
        assertThat(me.get("payout").get("accountMasked").asText()).isEqualTo("****4321");
        assertThat(me.toString()).doesNotContain("33330123");

        body(patchMe(minji, "{\"payoutBank\":\"국민\",\"payoutAccount\":\"123\",\"payoutHolder\":\"Minji\"}"), 400);

        JsonNode cleared = body(patchMe(minji, "{\"payoutBank\":\"\"}"), 200);
        assertThat(cleared.get("payout").isNull()).isTrue();
    }

    @Test
    void demoTravelersAlreadyHaveAccounts() throws Exception {
        JsonNode me = body(get("/api/users/me").header("Authorization", "Bearer " + login("traveler@carrypick.test")), 200);
        assertThat(me.get("user").get("payout").get("accountMasked").asText()).isEqualTo("****1234");
    }

    private RequestBuilder patchMe(String token, String body) {
        return patch("/api/users/me").header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON).content(body);
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
