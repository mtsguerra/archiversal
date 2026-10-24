package com.mtsguerra.archiversal.building;

import java.util.List;

/** Educational content shown on the reveal screen. */
public record Summary(String description, List<String> keyFeatures, List<String> funFacts) {

    public Summary {
        keyFeatures = Lists.nullToEmpty(keyFeatures);
        funFacts = Lists.nullToEmpty(funFacts);
    }
}
