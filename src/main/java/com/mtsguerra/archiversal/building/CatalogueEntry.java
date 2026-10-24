package com.mtsguerra.archiversal.building;

import java.util.List;

/** The few fields the Custom and Themed modes filter on, so the browser can count matches without every building. */
public record CatalogueEntry(String id, List<String> architects, String era, List<String> themes, Integer yearCompleted, String countryCode, String country) {

    static CatalogueEntry of(Building b) {
        return new CatalogueEntry(
                b.id(),
                b.architects().stream().map(Architect::name).toList(),
                b.era().name(),
                b.themes(),
                b.yearCompleted(),
                b.location().countryCode(),
                b.location().country());
    }
}
