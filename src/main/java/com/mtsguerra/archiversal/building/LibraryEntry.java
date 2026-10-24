package com.mtsguerra.archiversal.building;

import java.util.List;

/** What the Library shows of a building once it is unlocked, in the player's language ({@code photo} is its first exterior photo, shown on the plate once unlocked). Locked buildings are drawn from the era alone. */
public record LibraryEntry(String id, String name, List<String> architects, String era, Integer yearCompleted, String countryCode, String country, String photo) {

    static LibraryEntry of(Building b) {
        return new LibraryEntry(
                b.id(),
                b.name(),
                b.architects().stream().map(Architect::name).toList(),
                b.era().name(),
                b.yearCompleted(),
                b.location().countryCode(),
                b.location().country(),
                b.photos().stream().filter(p -> p.view() == PhotoView.EXTERIOR).map(Photo::src).findFirst().orElse(null));
    }
}
