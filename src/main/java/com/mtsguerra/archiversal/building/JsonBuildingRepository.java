package com.mtsguerra.archiversal.building;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Repository;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Loads the catalogue from a JSON file once at startup and serves it from memory.
 * Invalid data stops the application from starting.
 */
@Repository
class JsonBuildingRepository implements BuildingRepository {

    /** Language tag (as sent in {@code ?lang=}) of the translation files under {@code data/pt-BR/}. */
    static final String PT_BR = "pt-BR";

    private final List<Building> buildings;
    private final Map<String, Building> byId;
    private final List<Building> translatedBuildings;
    private final Map<String, Building> translatedById;

    JsonBuildingRepository(JsonMapper jsonMapper, Resource dataFile) {
        this(jsonMapper, dataFile, new Resource[0]);
    }

    @Autowired
    JsonBuildingRepository(
            JsonMapper jsonMapper,
            @Value("${archiversal.data-location:classpath:data/buildings.json}") Resource dataFile,
            @Value("${archiversal.translations-location:classpath*:data/pt-BR/*.json}") Resource[] translationFiles) {
        this.buildings = load(jsonMapper, dataFile);
        this.byId = index(buildings);
        this.translatedBuildings = translate(jsonMapper, buildings, translationFiles);
        this.translatedById = index(translatedBuildings);
    }

    private static Map<String, Building> index(List<Building> list) {
        Map<String, Building> index = new LinkedHashMap<>();
        list.forEach(b -> index.put(b.id(), b));
        return Map.copyOf(index);
    }

    /**
     * Applies every translation file (a JSON object of building id to {@link Translation}). Ids that
     * aren't in the catalogue are ignored here; a test over the shipped data asserts there are none.
     */
    private static List<Building> translate(JsonMapper jsonMapper, List<Building> source, Resource[] files) {
        Map<String, Translation> translations = new LinkedHashMap<>();
        for (Resource file : files) {
            try (InputStream in = file.getInputStream()) {
                Map<String, Translation> part = jsonMapper.readerFor(new TypeReference<Map<String, Translation>>() { })
                        .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                        .readValue(in);
                part.forEach((id, t) -> {
                    if (translations.putIfAbsent(id, t) != null) {
                        throw new IllegalStateException("Building '" + id + "' is translated twice (see " + file + ")");
                    }
                });
            } catch (IOException ex) {
                throw new UncheckedIOException("Cannot read translations from " + file, ex);
            }
        }
        return source.stream()
                .map(b -> translations.containsKey(b.id()) ? BuildingTranslator.apply(b, translations.get(b.id())) : b)
                .toList();
    }

    private static List<Building> load(JsonMapper jsonMapper, Resource dataFile) {
        List<Building> parsed;
        try (InputStream in = dataFile.getInputStream()) {
            // Strict about unknown fields so a typo in the data file fails instead of vanishing.
            parsed = jsonMapper.readerFor(new TypeReference<List<Building>>() { })
                    .with(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                    .readValue(in);
        } catch (IOException ex) {
            throw new UncheckedIOException("Cannot read building data from " + dataFile, ex);
        }

        List<String> errors = BuildingValidator.validate(parsed);
        if (!errors.isEmpty()) {
            throw new IllegalStateException("Invalid building data in " + dataFile + ":\n  - "
                    + String.join("\n  - ", errors));
        }
        return List.copyOf(parsed);
    }

    @Override
    public List<Building> findAll() {
        return buildings;
    }

    @Override
    public Optional<Building> findById(String id) {
        return Optional.ofNullable(byId.get(id));
    }

    @Override
    public List<Building> findAll(String lang) {
        return PT_BR.equals(lang) ? translatedBuildings : buildings;
    }

    @Override
    public Optional<Building> findById(String id, String lang) {
        return Optional.ofNullable((PT_BR.equals(lang) ? translatedById : byId).get(id));
    }
}
