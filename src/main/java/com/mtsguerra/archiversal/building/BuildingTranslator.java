package com.mtsguerra.archiversal.building;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.function.BiFunction;

import com.mtsguerra.archiversal.building.Translation.ArchitectText;
import com.mtsguerra.archiversal.building.Translation.ImageText;
import com.mtsguerra.archiversal.building.Translation.SummaryText;

/** Lays a {@link Translation} over a building. List sizes must match the source exactly. */
final class BuildingTranslator {

    private BuildingTranslator() {
    }

    static Building apply(Building b, Translation t) {
        String name = orElse(t.name(), b.name());
        Set<String> aliases = new LinkedHashSet<>(b.aliases());
        if (!name.equals(b.name())) aliases.add(b.name());
        aliases.addAll(Lists.nullToEmpty(t.aliases()));
        aliases.remove(name);

        Location location = b.location() == null ? null
                : new Location(orElse(t.city(), b.location().city()), b.location().country(), b.location().countryCode());

        return new Building(
                b.id(), name, List.copyOf(aliases),
                zip(b, "architects", b.architects(), t.architects(), BuildingTranslator::architect),
                location, b.yearCompleted(), b.era(), b.themes(), orElse(t.style(), b.style()),
                zip(b, "drawings", b.drawings(), t.drawings(), BuildingTranslator::drawing),
                zip(b, "photos", b.photos(), t.photos(), BuildingTranslator::photo),
                zip(b, "hints", b.hints(), t.hints(), (h, text) -> new Hint(h.order(), orElse(text, h.text()))),
                summary(b, t.summary()), orElse(t.wikipedia(), b.wikipedia()));
    }

    private static Architect architect(Architect a, ArchitectText t) {
        List<String> aliases = new ArrayList<>(a.aliases());
        aliases.addAll(Lists.nullToEmpty(t.aliases()));
        return new Architect(a.name(), List.copyOf(new LinkedHashSet<>(aliases)), orElse(t.lifespan(), a.lifespan()),
                orElse(t.nationality(), a.nationality()), orElse(t.bio(), a.bio()));
    }

    private static Drawing drawing(Drawing d, ImageText t) {
        return new Drawing(d.type(), orElse(t.label(), d.label()), d.src(), d.crop(), orElse(t.alt(), d.alt()),
                d.credit(), d.source());
    }

    private static Photo photo(Photo p, ImageText t) {
        return new Photo(p.view(), p.src(), p.crop(), orElse(t.alt(), p.alt()), orElse(t.caption(), p.caption()),
                p.credit(), p.source());
    }

    private static Summary summary(Building b, SummaryText t) {
        Summary s = b.summary();
        if (t == null || s == null) return s;
        return new Summary(
                orElse(t.description(), s.description()),
                same(b, "summary.keyFeatures", s.keyFeatures(), t.keyFeatures()),
                same(b, "summary.funFacts", s.funFacts(), t.funFacts()));
    }

    private static List<String> same(Building b, String what, List<String> source, List<String> translated) {
        if (translated == null) return source;
        if (translated.size() != source.size()) throw mismatch(b, what, source.size(), translated.size());
        return translated;
    }

    /** Pairs source entries with translated ones by position; null or absent translations keep the source. */
    private static <S, T> List<S> zip(Building b, String what, List<S> source, List<T> translated,
            BiFunction<S, T, S> merge) {
        if (translated == null) return source;
        if (translated.size() != source.size()) throw mismatch(b, what, source.size(), translated.size());
        List<S> result = new ArrayList<>();
        for (int i = 0; i < source.size(); i++) {
            T t = translated.get(i);
            result.add(t == null ? source.get(i) : merge.apply(source.get(i), t));
        }
        return List.copyOf(result);
    }

    private static IllegalStateException mismatch(Building b, String what, int expected, int actual) {
        return new IllegalStateException("Translation of " + b.id() + ": " + what + " has " + actual
                + " entries, the source has " + expected);
    }

    private static String orElse(String translated, String source) {
        return translated == null || translated.isBlank() ? source : translated;
    }
}
