package com.merchshop.importer.model;

/** Imagen de origen de un producto (solo se usa la primera al importar). */
public record ScrapedImage(String sourceUrl, Integer width, Integer height, int position) {
}
