package com.mtsguerra.archiversal.building;

/**
 * Architectural eras the player picks from, by the name of the style, not by date.
 */
public enum Era {
    ANCIENT_EGYPTIAN("Ancient Egyptian"),
    PRE_COLUMBIAN("Pre-Columbian"),
    CLASSICAL("Classical Antiquity"),
    BYZANTINE("Byzantine"),
    INDIC("Indian & Southeast Asian"),
    EAST_ASIAN("East Asian Traditional"),
    ISLAMIC("Islamic, Moorish & Mughal"),
    MEDIEVAL("Romanesque & Gothic"),
    RUSSIAN("Russian Orthodox"),
    OTTOMAN("Ottoman"),
    MANUELINE("Manueline"),
    RENAISSANCE("Renaissance"),
    MANNERISM("Mannerism"),
    BAROQUE("Baroque"),
    NEOCLASSICAL("Neoclassical"),
    INDUSTRIAL("Industrial & Iron"),
    HISTORICISM("Historicism & Gothic Revival"),
    ART_NOUVEAU("Art Nouveau"),
    ART_DECO("Art Deco"),
    MODERNISM("Modernism"),
    BRUTALISM("Brutalism"),
    POSTMODERNISM("Postmodernism"),
    CONTEMPORARY("Contemporary");

    private final String label;
    Era(String label) {
        this.label = label;
    }

    public String label() {
        return label;
    }
}
