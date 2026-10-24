package com.mtsguerra.archiversal.building;

import java.util.List;
import java.util.Set;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
class BuildingController {

    private final BuildingService service;

    BuildingController(BuildingService service) {
        this.service = service;
    }

    /**
     * {@code exclude} is a comma-separated list of ids already seen this session; {@code lang} is an
     * optional language tag ({@code pt-BR}), and anything unsupported serves the English source.
     */
    @GetMapping("/buildings/random")
    Building random(@RequestParam(defaultValue = "") Set<String> exclude, @RequestParam(required = false) String lang) {
        return service.random(exclude, lang);
    }

    @GetMapping("/buildings/catalogue")
    List<CatalogueEntry> catalogue() {
        return service.catalogue();
    }

    @GetMapping("/buildings/library")
    List<LibraryEntry> library(@RequestParam(required = false) String lang) {
        return service.library(lang);
    }

    @GetMapping("/buildings/ids")
    List<String> ids() {
        return service.ids();
    }

    @GetMapping("/buildings/{id}")
    Building byId(@PathVariable String id, @RequestParam(required = false) String lang) {
        return service.findById(id, lang);
    }

    @GetMapping("/eras")
    List<EraView> eras() {
        return service.eras();
    }
}
