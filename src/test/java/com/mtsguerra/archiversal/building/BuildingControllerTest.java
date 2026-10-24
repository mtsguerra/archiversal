package com.mtsguerra.archiversal.building;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest(properties = "archiversal.data-location=classpath:data/test-buildings.json")
@AutoConfigureMockMvc
class BuildingControllerTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    BuildingRepository repository;

    /** Every id except Villa Savoye, so a random pick has exactly one candidate. */
    private String allButSavoye() {
        return repository.findAll().stream().map(Building::id).filter(id -> !id.equals("test-villa"))
                .collect(java.util.stream.Collectors.joining(","));
    }

    @Test
    void returnsBuildingById() throws Exception {
        mvc.perform(get("/api/buildings/test-villa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Villa Savoye"))
                .andExpect(jsonPath("$.architects[*].name").value(Matchers.contains("Le Corbusier")))
                .andExpect(jsonPath("$.photos[*].view").value(Matchers.contains("EXTERIOR", "INTERIOR")))
                .andExpect(jsonPath("$.era").value("MODERNISM"))
                .andExpect(jsonPath("$.hints[0].order").value(1));
    }

    @Test
    void libraryListsEveryBuildingWithTheFieldsItShows() throws Exception {
        mvc.perform(get("/api/buildings/library"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(repository.findAll().size()))
                .andExpect(jsonPath("$[?(@.id == 'test-villa')].name").value(Matchers.contains("Villa Savoye")))
                .andExpect(jsonPath("$[?(@.id == 'test-villa')].era").value(Matchers.contains("MODERNISM")));
    }

    @Test
    void unknownIdIsProblem404() throws Exception {
        mvc.perform(get("/api/buildings/nope"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
                .andExpect(jsonPath("$.detail").value("No building with id 'nope'"));
    }

    @Test
    void randomSkipsExcludedBuildings() throws Exception {
        mvc.perform(get("/api/buildings/random").param("exclude", allButSavoye()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("test-villa"));
    }

    @Test
    void randomIgnoresExclusionsOnceEverythingIsSeen() throws Exception {
        mvc.perform(get("/api/buildings/random").param("exclude", allButSavoye() + ",test-villa"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void randomWorksWithoutExclusions() throws Exception {
        mvc.perform(get("/api/buildings/random"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNotEmpty());
    }

    @Test
    void listsBuildingIds() throws Exception {
        mvc.perform(get("/api/buildings/ids"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0]").isNotEmpty());
    }

    @Test
    void listsTheCatalogueForCustomFilters() throws Exception {
        mvc.perform(get("/api/buildings/catalogue"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").isNotEmpty())
                .andExpect(jsonPath("$[0].architects[0]").isNotEmpty())
                .andExpect(jsonPath("$[0].era").isNotEmpty())
                .andExpect(jsonPath("$[0].countryCode").isNotEmpty());
    }

    @Test
    void listsEras() throws Exception {
        mvc.perform(get("/api/eras"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value("ANCIENT_EGYPTIAN"))
                .andExpect(jsonPath("$[*].id").value(Matchers.hasItems("ART_DECO", "OTTOMAN", "MANUELINE", "ISLAMIC", "MANNERISM", "INDUSTRIAL", "EAST_ASIAN", "RUSSIAN")));
    }

    @Test
    void theApiIsReadOnly() throws Exception {
        for (var path : new String[] {"/api/eras", "/api/buildings/ids", "/api/buildings/catalogue", "/api/buildings/random"}) {
            mvc.perform(post(path)).andExpect(status().isMethodNotAllowed());
            mvc.perform(put(path)).andExpect(status().isMethodNotAllowed());
            mvc.perform(delete(path)).andExpect(status().isMethodNotAllowed());
        }
    }

    @Test
    void errorsDoNotLeakInternals() throws Exception {
        for (var path : new String[] {"/api/nope", "/api/buildings/does-not-exist", "/api/buildings/..%2f..%2fetc%2fpasswd", "/api/buildings/%00"}) {
            mvc.perform(get(path)).andExpect(content().string(Matchers.not(Matchers.anyOf(
                    Matchers.containsString("Exception"),
                    Matchers.containsString("at com."),
                    Matchers.containsString("at org."),
                    Matchers.containsString("java.")))));
        }
    }

    @Test
    void anUnknownLanguageServesTheSourceTextAndSetsNoCookie() throws Exception {
        mvc.perform(get("/api/buildings/test-villa").param("lang", "xx-<script>"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value("test-villa"))
                .andExpect(org.springframework.test.web.servlet.result.MockMvcResultMatchers.header().doesNotExist("Set-Cookie"));
    }
}
