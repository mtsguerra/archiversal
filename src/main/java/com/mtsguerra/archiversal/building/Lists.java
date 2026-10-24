package com.mtsguerra.archiversal.building;

import java.util.List;

/** Normalizes optional JSON arrays so records never expose null or mutable lists. */
final class Lists {

    private Lists() {
    }

    static <T> List<T> nullToEmpty(List<T> list) {
        return list == null ? List.of() : List.copyOf(list);
    }
}
