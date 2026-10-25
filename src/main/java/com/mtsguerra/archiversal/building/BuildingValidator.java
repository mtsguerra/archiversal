package com.mtsguerra.archiversal.building;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Checks the building catalogue for data errors. Collects every problem
 * instead of stopping at the first, so one startup run surfaces them all.
 */
final class BuildingValidator {

    static final int MIN_HINTS = 2;

    /** Themed mode's themes; each needs at least MIN_THEME_BUILDINGS buildings (asserted over the shipped data). */
    static final Set<String> THEMES = Set.of(
            "castles", "churches-cathedrals", "mosques", "monasteries", "palaces", "museums", "theatres-opera",
            "railway-stations", "bridges-towers", "skyscrapers", "libraries", "houses-villas", "stadiums",
            "asian-temples", "ancient-ruins", "brutalism", "art-nouveau", "art-deco", "portuguese-azulejo",
            "modern-icons");
    static final int MIN_THEME_BUILDINGS = 10;

    private static final Pattern ID = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");
    private static final Pattern COUNTRY_CODE = Pattern.compile("[A-Z]{2}");
    private static final String REMOTE_ASSETS = "https://upload.wikimedia.org/";
    private static final Pattern WIKIPEDIA = Pattern.compile("https://(en|pt)\\.wikipedia\\.org/wiki/\\S+");
    private static final String REMOTE_SOURCES = "https://commons.wikimedia.org/";
    // Fallback for a locally stored photo when Commons has none (e.g. French freedom-of-panorama gaps).
    private static final String FLICKR_SOURCES = "https://www.flickr.com/photos/";

    private BuildingValidator() {
    }

    static List<String> validate(List<Building> buildings) {
        List<String> errors = new ArrayList<>();
        Set<String> seenIds = new HashSet<>();

        for (int i = 0; i < buildings.size(); i++) {
            Building b = buildings.get(i);
            if (b == null) {
                errors.add("buildings[" + i + "]: entry is null");
                continue;
            }
            String where = "buildings[" + i + "] (" + b.id() + ")";
            Errors e = new Errors(errors, where);

            if (isBlank(b.id()) || !ID.matcher(b.id()).matches()) {
                e.add("id must be non-blank kebab-case");
            } else if (!seenIds.add(b.id())) {
                e.add("duplicate id");
            }
            e.requireText(b.name(), "name");
            if (b.era() == null) e.add("era is required");
            for (String theme : b.themes()) {
                if (!THEMES.contains(theme)) e.add("unknown theme '" + theme + "'");
            }
            if (new HashSet<>(b.themes()).size() != b.themes().size()) e.add("themes must not repeat");

            validateArchitects(b.architects(), e);
            validateLocation(b.location(), e);
            validateDrawings(b, e);
            validatePhotos(b, e);
            validateHints(b, e);
            validateSummary(b.summary(), e);
            if (b.wikipedia() == null || !WIKIPEDIA.matcher(b.wikipedia()).matches()) {
                e.add("wikipedia must be a Wikipedia article URL like 'https://en.wikipedia.org/wiki/Name'");
            }
        }
        return errors;
    }

    private static void validateArchitects(List<Architect> architects, Errors e) {
        if (architects.isEmpty()) e.add("at least one architect is required");
        for (int i = 0; i < architects.size(); i++) {
            Architect a = architects.get(i);
            String field = "architects[" + i + "]";
            if (a == null) {
                e.add(field + " is null");
                continue;
            }
            e.requireText(a.name(), field + ".name");
            e.requireText(a.bio(), field + ".bio");
        }
    }

    private static void validateLocation(Location l, Errors e) {
        if (l == null) {
            e.add("location is required");
            return;
        }
        e.requireText(l.country(), "location.country");
        if (l.countryCode() == null || !COUNTRY_CODE.matcher(l.countryCode()).matches()) {
            e.add("location.countryCode must be an ISO alpha-2 code like 'FR'");
        }
    }

    /** Cuts are optional (many works are still in copyright), but every one must be a real image. */
    private static void validateDrawings(Building b, Errors e) {
        for (int i = 0; i < b.drawings().size(); i++) {
            Drawing d = b.drawings().get(i);
            String field = "drawings[" + i + "]";
            if (d.type() == null) e.add(field + ".type is required");
            e.requireText(d.label(), field + ".label");
            e.requireAsset(b.id(), d.src(), field + ".src");
            e.requireText(d.alt(), field + ".alt");
            e.optionalSource(d.source(), field + ".source");
            validateCrop(d.crop(), field + ".crop", e);
        }
    }

    /** The hard rule: an exterior photo plus either an interior or a second exterior, so the board never shows a placeholder. */
    private static void validatePhotos(Building b, Errors e) {
        int exteriors = 0;
        boolean interior = false;
        for (int i = 0; i < b.photos().size(); i++) {
            Photo p = b.photos().get(i);
            String field = "photos[" + i + "]";
            if (p.view() == null) {
                e.add(field + ".view is required");
            } else {
                if (p.view() == PhotoView.EXTERIOR) exteriors++;
                interior |= p.view() == PhotoView.INTERIOR;
            }
            e.requireAsset(b.id(), p.src(), field + ".src");
            e.requireText(p.alt(), field + ".alt");
            e.optionalSource(p.source(), field + ".source");
            validateCrop(p.crop(), field + ".crop", e);
        }
        if (exteriors == 0) e.add("at least one EXTERIOR photo is required");
        else if (!interior && exteriors < 2) e.add("an INTERIOR photo (or a second EXTERIOR photo) is required");
    }

    private static void validateHints(Building b, Errors e) {
        List<Hint> hints = b.hints();
        if (hints.size() < MIN_HINTS) e.add("at least " + MIN_HINTS + " hints are required");
        for (int i = 0; i < hints.size(); i++) {
            Hint h = hints.get(i);
            String field = "hints[" + i + "]";
            if (h.order() != i + 1) e.add(field + ".order must be " + (i + 1) + " (hints are listed in reveal order)");
            e.requireText(h.text(), field + ".text");
        }
    }

    private static void validateCrop(Crop c, String field, Errors e) {
        if (c == null) return;
        boolean inside = c.x() >= 0 && c.y() >= 0 && c.w() > 0 && c.h() > 0
                && c.x() + c.w() <= 1.0001 && c.y() + c.h() <= 1.0001;
        if (!inside) e.add(field + " must be fractions within the image (x + w <= 1, y + h <= 1)");
    }

    private static void validateSummary(Summary s, Errors e) {
        if (s == null) {
            e.add("summary is required");
            return;
        }
        e.requireText(s.description(), "summary.description");
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }

    private record Errors(List<String> sink, String where) {

        void add(String message) {
            sink.add(where + ": " + message);
        }

        void requireText(String value, String field) {
            if (isBlank(value)) add(field + " is required");
        }

        /**
         * Assets are either Wikimedia Commons uploads or files in the building's own
         * local folder (which catches copy-paste mix-ups between buildings).
         */
        void requireAsset(String buildingId, String src, String field) {
            String local = "/buildings/" + buildingId + "/";
            if (src == null || !(src.startsWith(local) || src.startsWith(REMOTE_ASSETS))) {
                add(field + " must start with '" + local + "' or '" + REMOTE_ASSETS + "'");
            }
        }

        void optionalSource(String source, String field) {
            if (source != null && !source.startsWith(REMOTE_SOURCES) && !source.startsWith(FLICKR_SOURCES)) add(field + " must start with '" + REMOTE_SOURCES + "' or '" + FLICKR_SOURCES + "'");
        }
    }
}
