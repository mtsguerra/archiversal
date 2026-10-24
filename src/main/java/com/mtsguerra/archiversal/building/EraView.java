package com.mtsguerra.archiversal.building;

/** API shape for an {@link Era}; {@code id} matches the value used in {@link Building#era()}. */
public record EraView(String id, String label) {

    static EraView of(Era era) {
        return new EraView(era.name(), era.label());
    }
}
