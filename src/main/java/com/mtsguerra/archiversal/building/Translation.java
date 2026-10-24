package com.mtsguerra.archiversal.building;

import java.util.List;

/**
 * A translated overlay for one building: only the human-readable text. Anything left out (null)
 * keeps the source value. List entries line up by position with the source building's lists.
 *
 * @param wikipedia the Portuguese Wikipedia article, when one exists
 * @param aliases extra accepted names, added to the source aliases (the source name stays accepted)
 */
record Translation(
        String name,
        List<String> aliases,
        List<ArchitectText> architects,
        String city,
        String style,
        List<ImageText> drawings,
        List<ImageText> photos,
        List<String> hints,
        SummaryText summary,
        String wikipedia
) {

    record ArchitectText(List<String> aliases, String nationality, String lifespan, String bio) {
    }

    record ImageText(String label, String alt, String caption) {
    }

    record SummaryText(String description, List<String> keyFeatures, List<String> funFacts) {
    }
}
