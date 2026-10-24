package com.mtsguerra.archiversal.building;

import java.util.Arrays;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.stereotype.Service;

import com.mtsguerra.archiversal.common.NotFoundException;

@Service
public class BuildingService {

    private final BuildingRepository repository;

    public BuildingService(BuildingRepository repository) {
        this.repository = repository;
    }

    public Building findById(String id, String lang) {
        return repository.findById(id, lang)
                .orElseThrow(() -> new NotFoundException("No building with id '" + id + "'"));
    }

    /**
     * Picks a random building the player hasn't seen. Once every building has
     * been excluded, the exclusions are ignored so play never dead-ends.
     */
    public Building random(Set<String> exclude) {
        return random(exclude, null);
    }

    public Building random(Set<String> exclude, String lang) {
        List<Building> all = repository.findAll(lang);
        List<Building> unseen = all.stream().filter(b -> !exclude.contains(b.id())).toList();
        if (all.isEmpty()) throw new NotFoundException("The building catalogue is empty");
        List<Building> pool = unseen.isEmpty() ? all : unseen;
        return pool.get(ThreadLocalRandom.current().nextInt(pool.size()));
    }

    public List<CatalogueEntry> catalogue() {
        return repository.findAll().stream().map(CatalogueEntry::of).toList();
    }

    /** The Library's rows in {@code lang}; languages without translations serve the source text. */
    public List<LibraryEntry> library(String lang) {
        return repository.findAll(lang).stream().map(LibraryEntry::of).toList();
    }

    /** Every building id, sorted: the browser derives the daily building from it. */
    public List<String> ids() {
        return repository.findAll().stream().map(Building::id).sorted().toList();
    }

    public List<EraView> eras() {
        return Arrays.stream(Era.values()).map(EraView::of).toList();
    }
}
