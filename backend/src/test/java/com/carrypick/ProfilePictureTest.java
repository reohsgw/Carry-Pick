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
import org.springframework.test.web.servlet.RequestBuilder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {"app.payment.mode=mock", "app.upload-dir=target/test-uploads"})
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_EACH_TEST_METHOD)
class ProfilePictureTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;

    @Test
    void travelerSetsPicture_buyersSeeIt_thenRemovesIt() throws Exception {
        String traveler = login("traveler@carrypick.test");

        MockMultipartFile file = new MockMultipartFile("file", "me.png", "image/png", new byte[]{1, 2, 3});
        String url = body(multipart("/api/files").file(file).header("Authorization", "Bearer " + traveler), 200)
                .get("url").asText();
        assertThat(url).startsWith("/uploads/").endsWith(".png");

        JsonNode me = body(patchMe(traveler, "{\"avatarUrl\":\"" + url + "\"}"), 200);
        assertThat(me.get("avatarUrl").asText()).isEqualTo(url);

        String buyer = login("buyer@carrypick.test");
        JsonNode offers = body(get("/api/offers?country=JP").header("Authorization", "Bearer " + buyer), 200);
        boolean shown = false;
        for (JsonNode o : offers) {
            if (o.get("traveler").get("name").asText().startsWith("Kenji")) {
                assertThat(o.get("traveler").get("avatarUrl").asText()).isEqualTo(url);
                shown = true;
            }
        }
        assertThat(shown).isTrue();

        JsonNode cleared = body(patchMe(traveler, "{\"avatarUrl\":\"\"}"), 200);
        assertThat(cleared.get("avatarUrl").isNull()).isTrue();
    }

    @Test
    void outsideLinksAndPdfsAreRefused() throws Exception {
        String buyer = login("buyer@carrypick.test");
        body(patchMe(buyer, "{\"avatarUrl\":\"https://evil.example/x.png\"}"), 400);
        body(patchMe(buyer, "{\"avatarUrl\":\"/uploads/../secret.png\"}"), 400);
        body(patchMe(buyer, "{\"avatarUrl\":\"/uploads/abc.pdf\"}"), 400);
        JsonNode me = body(get("/api/users/me").header("Authorization", "Bearer " + buyer), 200);
        assertThat(me.get("user").get("avatarUrl").isNull()).isTrue();
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
