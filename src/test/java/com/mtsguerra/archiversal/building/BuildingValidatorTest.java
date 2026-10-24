package com.mtsguerra.archiversal.building;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;

import org.junit.jupiter.api.Test;

class BuildingValidatorTest {

    @Test
    void acceptsValidBuilding() {
        assertThat(BuildingValidator.validate(List.of(building("a", hints(2))))).isEmpty();
    }

    @Test
    void rejectsDuplicateIds() {
        List<String> errors = BuildingValidator.validate(List.of(building("a", hints(2)), building("a", hints(2))));

        assertThat(errors).singleElement().asString().contains("duplicate id");
    }

    @Test
    void rejectsTooFewHints() {
        List<String> errors = BuildingValidator.validate(List.of(building("a", hints(1))));

        assertThat(errors).singleElement().asString().contains("at least 2 hints");
    }

    @Test
    void rejectsHintsOutOfOrder() {
        List<Hint> hints = List.of(fact(2), fact(1));

        List<String> errors = BuildingValidator.validate(List.of(building("a", hints)));

        assertThat(errors).hasSize(2).allSatisfy(e -> assertThat(e).contains(".order must be"));
    }

    @Test
    void rejectsHintsWithoutText() {
        List<Hint> hints = List.of(fact(1), new Hint(2, " "));

        List<String> errors = BuildingValidator.validate(List.of(building("a", hints)));

        assertThat(errors).singleElement().asString().contains("hints[1].text is required");
    }

    @Test
    void rejectsUnknownThemes() {
        Building b = building("a", hints(2));
        Building typo = new Building(b.id(), b.name(), b.aliases(), b.architects(), b.location(),
                b.yearCompleted(), b.era(), List.of("castels"), b.style(), b.drawings(), b.photos(), b.hints(), b.summary(), b.wikipedia());

        assertThat(BuildingValidator.validate(List.of(typo))).singleElement().asString().contains("unknown theme 'castels'");
    }

    @Test
    void rejectsRepeatedThemes() {
        Building b = building("a", hints(2));
        Building twice = new Building(b.id(), b.name(), b.aliases(), b.architects(), b.location(),
                b.yearCompleted(), b.era(), List.of("castles", "castles"), b.style(), b.drawings(), b.photos(), b.hints(), b.summary(), b.wikipedia());

        assertThat(BuildingValidator.validate(List.of(twice))).singleElement().asString().contains("themes must not repeat");
    }

    @Test
    void rejectsMissingArchitects() {
        Building b = building("a", hints(2));
        Building noArchitects = new Building(b.id(), b.name(), b.aliases(), List.of(), b.location(),
                b.yearCompleted(), b.era(), b.themes(), b.style(), b.drawings(), b.photos(), b.hints(), b.summary(), b.wikipedia());

        List<String> errors = BuildingValidator.validate(List.of(noArchitects));

        assertThat(errors).singleElement().asString().contains("at least one architect");
    }

    @Test
    void rejectsAssetsOutsideTheBuildingFolder() {
        Building b = withDrawings(building("a", hints(2)), drawing("/buildings/other/plan.jpg", null));

        List<String> errors = BuildingValidator.validate(List.of(b));

        assertThat(errors).singleElement().asString().contains("must start with '/buildings/a/'");
    }

    @Test
    void acceptsWikimediaUrlsWithCrops() {
        Building b = withDrawings(building("a", hints(2)),
                drawing("https://upload.wikimedia.org/wikipedia/commons/a/ab/Plan.jpg", new Crop(0.1, 0, 0.8, 1)));

        assertThat(BuildingValidator.validate(List.of(b))).isEmpty();
    }

    @Test
    void acceptsBuildingsWithoutCuts() {
        assertThat(BuildingValidator.validate(List.of(withDrawings(building("a", hints(2)))))).isEmpty();
    }

    @Test
    void rejectsPlaceholderDrawings() {
        Building b = withDrawings(building("a", hints(2)), drawing(null, null));

        assertThat(BuildingValidator.validate(List.of(b))).singleElement().asString().contains("drawings[0].src must start with");
    }

    @Test
    void requiresAnExteriorAndAnInteriorOrSecondExteriorPhoto() {
        Building b = building("a", hints(2));
        Building twoExteriors = withPhotos(b, photo(PhotoView.EXTERIOR, "/buildings/a/1.jpg"), photo(PhotoView.EXTERIOR, "/buildings/a/2.jpg"));
        Building oneExterior = withPhotos(b, photo(PhotoView.EXTERIOR, "/buildings/a/1.jpg"));
        Building interiorOnly = withPhotos(b, photo(PhotoView.INTERIOR, "/buildings/a/1.jpg"));
        Building none = withPhotos(b);

        assertThat(BuildingValidator.validate(List.of(twoExteriors))).isEmpty();
        assertThat(BuildingValidator.validate(List.of(oneExterior)))
                .singleElement().asString().contains("second EXTERIOR");
        assertThat(BuildingValidator.validate(List.of(interiorOnly)))
                .singleElement().asString().contains("at least one EXTERIOR photo");
        assertThat(BuildingValidator.validate(List.of(none)))
                .singleElement().asString().contains("at least one EXTERIOR photo");
    }

    @Test
    void rejectsPhotosWithoutSrcOrView() {
        Building b = withPhotos(building("a", hints(2)),
                photo(PhotoView.EXTERIOR, "/buildings/a/1.jpg"), photo(PhotoView.INTERIOR, null), photo(null, "/buildings/a/3.jpg"));

        assertThat(BuildingValidator.validate(List.of(b)))
                .hasSize(2).anySatisfy(e -> assertThat(e).contains("photos[1].src")).anySatisfy(e -> assertThat(e).contains("photos[2].view"));
    }

    @Test
    void acceptsBuildingsStillUnderConstruction() {
        Building b = building("a", hints(2));
        Building ongoing = new Building(b.id(), b.name(), b.aliases(), b.architects(), b.location(),
                null, b.era(), b.themes(), b.style(), b.drawings(), b.photos(), b.hints(), b.summary(), b.wikipedia());

        assertThat(BuildingValidator.validate(List.of(ongoing))).isEmpty();
    }

    @Test
    void rejectsOtherRemoteHosts() {
        Building b = withDrawings(building("a", hints(2)), drawing("https://example.com/plan.jpg", null));

        assertThat(BuildingValidator.validate(List.of(b))).singleElement().asString().contains("upload.wikimedia.org");
    }

    @Test
    void rejectsCropsOutsideTheImage() {
        Building b = withDrawings(building("a", hints(2)), drawing("/buildings/a/plan.jpg", new Crop(0.5, 0, 0.6, 1)));

        assertThat(BuildingValidator.validate(List.of(b))).singleElement().asString().contains("crop must be fractions");
    }

    @Test
    void reportsEveryProblemAtOnce() {
        Building broken = new Building("Not Kebab", null, null, null, null, null, null, null, null, null, null, null, null, null);

        List<String> errors = BuildingValidator.validate(List.of(broken));

        assertThat(errors).hasSizeGreaterThanOrEqualTo(8);
    }

    private static Building building(String id, List<Hint> hints) {
        return new Building(
                id,
                "Name",
                null,
                List.of(new Architect("Architect", null, "1900–1990", "French", "Bio")),
                new Location("City", "France", "FR"),
                1950,
                Era.MODERNISM,
                List.of("museums"),
                "Style",
                List.of(drawing("/buildings/" + id + "/plan.jpg", null)),
                List.of(photo(PhotoView.EXTERIOR, "/buildings/" + id + "/exterior.jpg"), photo(PhotoView.INTERIOR, "/buildings/" + id + "/interior.jpg")),
                hints,
                new Summary("Description", null, null),
                "https://en.wikipedia.org/wiki/Name");
    }

    private static Building withDrawings(Building b, Drawing... drawings) {
        return new Building(b.id(), b.name(), b.aliases(), b.architects(), b.location(),
                b.yearCompleted(), b.era(), b.themes(), b.style(), List.of(drawings), b.photos(), b.hints(), b.summary(), b.wikipedia());
    }

    private static Building withPhotos(Building b, Photo... photos) {
        return new Building(b.id(), b.name(), b.aliases(), b.architects(), b.location(),
                b.yearCompleted(), b.era(), b.themes(), b.style(), b.drawings(), java.util.Arrays.asList(photos), b.hints(), b.summary(), b.wikipedia());
    }

    private static Drawing drawing(String src, Crop crop) {
        return new Drawing(DrawingType.FLOOR_PLAN, "Plan", src, crop, "alt", null, null);
    }

    private static Photo photo(PhotoView view, String src) {
        return new Photo(view, src, null, "alt", null, null, null);
    }

    private static List<Hint> hints(int count) {
        return java.util.stream.IntStream.rangeClosed(1, count).mapToObj(BuildingValidatorTest::fact).toList();
    }

    private static Hint fact(int order) {
        return new Hint(order, "Fact " + order);
    }
}
