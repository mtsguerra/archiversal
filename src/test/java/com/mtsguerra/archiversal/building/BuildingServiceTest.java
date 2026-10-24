package com.mtsguerra.archiversal.building;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.mtsguerra.archiversal.common.NotFoundException;

class BuildingServiceTest {

    @Test
    void randomOnAnEmptyCatalogueIsNotFoundNotACrash() {
        BuildingRepository empty = new BuildingRepository() {
            public List<Building> findAll() { return List.of(); }
            public Optional<Building> findById(String id) { return Optional.empty(); }
        };

        assertThatThrownBy(() -> new BuildingService(empty).random(Set.of())).isInstanceOf(NotFoundException.class);
    }
}
