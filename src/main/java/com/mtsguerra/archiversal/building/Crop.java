package com.mtsguerra.archiversal.building;

/**
 * Region of an image to show, as fractions of its width and height. Lets a
 * hotlinked drawing hide a title block that would name the building.
 */
public record Crop(double x, double y, double w, double h) {
}
