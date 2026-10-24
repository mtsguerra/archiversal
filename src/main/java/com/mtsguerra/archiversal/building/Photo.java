package com.mtsguerra.archiversal.building;

/**
 * A photograph shown as a board tab from the start of the round.
 *
 * @param src     a local root-relative path or an {@code https://upload.wikimedia.org/} URL
 * @param crop    optional region of the image to show (e.g. to hide lettering that names the building)
 * @param caption optional short caption for the reveal summary
 * @param source  optional page the image comes from (e.g. its Wikimedia Commons file page)
 */
public record Photo(PhotoView view, String src, Crop crop, String alt, String caption, String credit, String source) {
}
