package com.mtsguerra.archiversal.building;

/**
 * A technical drawing shown from the start of a round.
 *
 * @param src    a local root-relative path or an {@code https://upload.wikimedia.org/} URL
 * @param crop   optional region of the image to show
 * @param source optional page the image comes from (e.g. its Wikimedia Commons file page)
 */
public record Drawing(DrawingType type, String label, String src, Crop crop, String alt, String credit, String source) {
}
