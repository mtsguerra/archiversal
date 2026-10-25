package com.mtsguerra.archiversal.building;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;

import tools.jackson.databind.json.JsonMapper;

class JsonBuildingRepositoryTest {

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    @Test
    void shippedCatalogueLoadsAndPassesValidation() {
        // Throws if any shipped building breaks a rule (e.g. lacks an interior photo).
        var repository = new JsonBuildingRepository(jsonMapper, new ClassPathResource("data/buildings.json"));

        assertThat(repository.findAll()).allSatisfy(b -> assertThat(b.photos()).hasSizeGreaterThanOrEqualTo(2));
    }

    @Test
    void everyThemeHasEnoughShippedBuildings() {
        var repository = new JsonBuildingRepository(jsonMapper, new ClassPathResource("data/buildings.json"));

        for (String theme : BuildingValidator.THEMES) {
            long count = repository.findAll().stream().filter(b -> b.themes().contains(theme)).count();
            assertThat(count).as(theme).isGreaterThanOrEqualTo(BuildingValidator.MIN_THEME_BUILDINGS);
        }
    }

    @Test
    void shippedPortugueseTranslationsCoverEveryBuildingAndMatchTheSource() throws Exception {
        var resolver = new org.springframework.core.io.support.PathMatchingResourcePatternResolver();
        var files = resolver.getResources("classpath*:data/pt-BR/*.json");
        var repository = new JsonBuildingRepository(jsonMapper, new ClassPathResource("data/buildings.json"), files);

        // Loading throws if a translation's lists don't line up with the source building.
        var ids = new java.util.HashSet<String>();
        for (var file : files) {
            try (var in = file.getInputStream()) {
                ids.addAll(jsonMapper.readTree(in).propertyNames());
            }
        }
        assertThat(ids).containsExactlyInAnyOrderElementsOf(
                repository.findAll().stream().map(Building::id).toList());
        assertThat(repository.findById("villa-rotonda", "pt-BR")).get()
                .satisfies(b -> assertThat(b.aliases()).contains("Villa Rotonda"))
                .satisfies(b -> assertThat(b.hints()).hasSize(3));
        assertThat(repository.findById("villa-rotonda", "pt-BR").get().wikipedia())
                .isEqualTo("https://pt.wikipedia.org/wiki/Villa_Capra");
        assertThat(repository.findById("villa-rotonda", "en").get().wikipedia())
                .isEqualTo("https://en.wikipedia.org/wiki/Villa_La_Rotonda");
        assertThat(repository.findById("villa-rotonda", "en").get().style()).isEqualTo("Palladian");
        assertThat(repository.findById("villa-rotonda", "pt-BR").get().style()).isEqualTo("Palladiano");
    }

    @Test
    void testCatalogueLoads() {
        var repository = new JsonBuildingRepository(jsonMapper, new ClassPathResource("data/test-buildings.json"));

        assertThat(repository.findById("test-villa")).get()
                .satisfies(b -> assertThat(b.hints()).hasSizeGreaterThanOrEqualTo(BuildingValidator.MIN_HINTS));
    }

    @Test
    void failsOnUnknownField() {
        var data = json("[{\"id\": \"a\", \"nmae\": \"typo\"}]");

        assertThatThrownBy(() -> new JsonBuildingRepository(jsonMapper, data))
                .hasMessageContaining("nmae");
    }

    @Test
    void failsWithValidationErrors() {
        var data = json("[{\"id\": \"a\"}]");

        assertThatThrownBy(() -> new JsonBuildingRepository(jsonMapper, data))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Invalid building data")
                .hasMessageContaining("name is required");
    }

    private static ByteArrayResource json(String content) {
        return new ByteArrayResource(content.getBytes(StandardCharsets.UTF_8));
    }

    @Test
    void everyLinkInTheShippedDataIsHttpsToWikipediaOrWikimedia() throws Exception {
        // The pt-BR overlay can carry its own links, and the validator only sees the English source.
        var resolver = new org.springframework.core.io.support.PathMatchingResourcePatternResolver();
        var files = resolver.getResources("classpath*:data/pt-BR/*.json");
        var repository = new JsonBuildingRepository(jsonMapper, new ClassPathResource("data/buildings.json"), files);
        var article = java.util.regex.Pattern.compile("https://(en|pt)\\.wikipedia\\.org/wiki/\\S+");
        var commons = java.util.regex.Pattern.compile("https://(commons\\.wikimedia\\.org/wiki|www\\.flickr\\.com/photos)/\\S+");

        for (var lang : new String[] {null, "pt-BR"}) {
            for (var b : repository.findAll(lang)) {
                assertThat(b.wikipedia()).as(b.id() + " wikipedia").matches(article);
                b.drawings().forEach(d -> assertThat(d.source()).as(b.id() + " drawing source").matches(commons));
                b.photos().forEach(p -> assertThat(p.source()).as(b.id() + " photo source").matches(commons));
            }
        }
    }
}
