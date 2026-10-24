package com.mtsguerra.archiversal.building;

import java.util.List;

/**
 * A famous building as served to the game. This record is both the storage
 * model and the API response, since the client needs every field for a round.
 *
 * @param themes ids from {@link BuildingValidator#THEMES} this building belongs to; Themed mode plays one theme at a time
 * @param yearCompleted null while the building is still under construction
 * @param wikipedia the Wikipedia article (English, or Portuguese when none exists), offered after the reveal as further reading
 */
public record Building(
        String id,
        String name,
        List<String> aliases,
        List<Architect> architects,
        Location location,
        Integer yearCompleted,
        Era era,
        List<String> themes,
        String style,
        List<Drawing> drawings,
        List<Photo> photos,
        List<Hint> hints,
        Summary summary,
        String wikipedia
) {
    public Building {
        aliases = Lists.nullToEmpty(aliases);
        themes = Lists.nullToEmpty(themes);
        architects = Lists.nullToEmpty(architects);
        drawings = Lists.nullToEmpty(drawings);
        photos = Lists.nullToEmpty(photos);
        hints = Lists.nullToEmpty(hints);
    }
}
