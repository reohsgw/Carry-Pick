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

@SpringBootTest(properties = {"app.payment.mode=mock"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class TripEditTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void travelerEditsCityAndDates_countryLockedOnceProductsArePosted() throws Exception {
        String kenji = login("traveler@carrypick.test");
        LocalDate d = LocalDate.now();

        long tripId = body(send(post("/api/trips"), kenji, trip("JP", "Tokyo", d.plusDays(10), d.plusDays(15), "5kg")), 201)
                .get("id").asLong();

        // No products yet: everything can change, including the country.
        JsonNode edited = body(send(put("/api/trips/" + tripId), kenji, trip("FR", "Paris", d.plusDays(12), d.plusDays(20), "One suitcase")), 200);
        assertThat(edited.get("countryCode").asText()).isEqualTo("FR");
        assertThat(edited.get("city").asText()).isEqualTo("Paris");
        assertThat(edited.get("departDate").asText()).isEqualTo(d.plusDays(12).toString());

        // Invalid dates are refused just like on create.
        body(send(put("/api/trips/" + tripId), kenji, trip("FR", "Paris", d.plusDays(12), d.plusDays(5), null)), 400);

        // Someone else's trip can't be edited.
        String minji = login("buyer@carrypick.test");
        body(send(put("/api/trips/" + tripId), minji, trip("FR", "Lyon", d.plusDays(12), d.plusDays(20), null)), 403);

        // After posting a product, the city still changes but the country is locked.
        body(send(post("/api/offers"), kenji,
                "{\"tripId\":" + tripId + ",\"productName\":\"Macarons\",\"estPrice\":20000,\"reward\":3000,\"quantity\":1,\"weightGrams\":300}"), 201);
        JsonNode city = body(send(put("/api/trips/" + tripId), kenji, trip("FR", "Nice", d.plusDays(12), d.plusDays(20), null)), 200);
        assertThat(city.get("city").asText()).isEqualTo("Nice");
        JsonNode locked = body(send(put("/api/trips/" + tripId), kenji, trip("JP", "Tokyo", d.plusDays(12), d.plusDays(20), null)), 409);
        assertThat(locked.get("code").asText()).isEqualTo("TRIP_HAS_OFFERS");
    }

    @Test
    void travelerDeletesTrip_withItsProducts_butNotOnceSomeoneOrdered() throws Exception {
        String kenji = login("traveler@carrypick.test");
        String minji = login("buyer@carrypick.test");
        LocalDate d = LocalDate.now();

        // A trip with a product nobody ordered: both are deleted.
        long tripA = body(send(post("/api/trips"), kenji, trip("JP", "Tokyo", d.plusDays(10), d.plusDays(15), null)), 201).get("id").asLong();
        long offerA = body(send(post("/api/offers"), kenji,
                "{\"tripId\":" + tripA + ",\"productName\":\"Matcha\",\"estPrice\":20000,\"reward\":3000,\"quantity\":1,\"weightGrams\":300}"), 201)
                .get("id").asLong();
        body(delete("/api/trips/" + tripA).header("Authorization", "Bearer " + minji), 403);
        body(delete("/api/trips/" + tripA).header("Authorization", "Bearer " + kenji), 204);
        body(get("/api/offers/" + offerA), 404);
        JsonNode mine = body(get("/api/trips/me").header("Authorization", "Bearer " + kenji), 200);
        mine.forEach(t -> assertThat(t.get("id").asLong()).isNotEqualTo(tripA));

        // A trip someone has ordered from stays.
        long tripB = body(send(post("/api/trips"), kenji, trip("JP", "Osaka", d.plusDays(10), d.plusDays(15), null)), 201).get("id").asLong();
        long offerB = body(send(post("/api/offers"), kenji,
                "{\"tripId\":" + tripB + ",\"productName\":\"Snacks\",\"estPrice\":20000,\"reward\":3000,\"quantity\":2,\"weightGrams\":300}"), 201)
                .get("id").asLong();
        body(send(post("/api/orders"), minji, "{\"offerId\":" + offerB + ",\"quantity\":1}"), 201);
        JsonNode refused = body(delete("/api/trips/" + tripB).header("Authorization", "Bearer " + kenji), 409);
        assertThat(refused.get("code").asText()).isEqualTo("TRIP_HAS_ORDERS");
    }

    @Test
    void travelerDeletesProduct_unlessSomeoneOrderedIt() throws Exception {
        String kenji = login("traveler@carrypick.test");
        String minji = login("buyer@carrypick.test");
        LocalDate d = LocalDate.now();
        long tripId = body(send(post("/api/trips"), kenji, trip("JP", "Tokyo", d.plusDays(10), d.plusDays(15), null)), 201).get("id").asLong();
        String offer = "{\"tripId\":" + tripId + ",\"productName\":\"Matcha\",\"estPrice\":20000,\"reward\":3000,\"quantity\":2,\"weightGrams\":300}";

        long free = body(send(post("/api/offers"), kenji, offer), 201).get("id").asLong();
        body(delete("/api/offers/" + free).header("Authorization", "Bearer " + minji), 403);
        body(delete("/api/offers/" + free).header("Authorization", "Bearer " + kenji), 204);
        body(get("/api/offers/" + free), 404);

        long ordered = body(send(post("/api/offers"), kenji, offer), 201).get("id").asLong();
        body(send(post("/api/orders"), minji, "{\"offerId\":" + ordered + ",\"quantity\":1}"), 201);
        JsonNode refused = body(delete("/api/offers/" + ordered).header("Authorization", "Bearer " + kenji), 409);
        assertThat(refused.get("code").asText()).isEqualTo("OFFER_HAS_ORDERS");
    }

    private static String trip(String country, String city, LocalDate depart, LocalDate ret, String note) {
        return "{\"countryCode\":\"" + country + "\",\"city\":\"" + city + "\",\"departDate\":\"" + depart
                + "\",\"returnDate\":\"" + ret + "\"" + (note == null ? "" : ",\"luggageNote\":\"" + note + "\"") + "}";
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
