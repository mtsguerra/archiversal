package com.mtsguerra.archiversal.building;

import java.util.List;
import java.util.Optional;

public interface BuildingRepository {

    List<Building> findAll();

    Optional<Building> findById(String id);

    /** The catalogue in {@code lang} (e.g. {@code pt-BR}); languages without translations serve the source text. */
    default List<Building> findAll(String lang) {
        return findAll();
    }

    default Optional<Building> findById(String id, String lang) {
        return findById(id);
    }
}
