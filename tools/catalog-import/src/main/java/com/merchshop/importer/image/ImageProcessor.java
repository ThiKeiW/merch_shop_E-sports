package com.merchshop.importer.image;

import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.nio.file.Files;
import java.nio.file.Path;

import javax.imageio.ImageIO;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.merchshop.importer.fetch.CachedFetcher;

import net.coobird.thumbnailator.Thumbnails;

/**
 * Descarga la imagen principal y genera una copia CARD en WebP (800 px de
 * ancho, sin ampliar). Si el writer WebP no estuviera disponible, guarda JPEG
 * como respaldo para no perder la imagen.
 */
public final class ImageProcessor {

    private static final Logger log = LoggerFactory.getLogger(ImageProcessor.class);
    private static final int CARD_WIDTH = 800;
    private static final float QUALITY = 0.85f;

    private final CachedFetcher fetcher;
    private final Path imagesDir;
    private final boolean webpAvailable;

    public ImageProcessor(CachedFetcher fetcher, Path imagesDir) throws Exception {
        this.fetcher = fetcher;
        this.imagesDir = imagesDir;
        Files.createDirectories(imagesDir);
        this.webpAvailable = ImageIO.getImageWritersByFormatName("webp").hasNext();
        if (!webpAvailable) {
            log.warn("Writer WebP no disponible; se guardaran las imagenes en JPEG");
        }
    }

    public record Saved(String fileName, String format, int width, int height) {
    }

    /** Guarda la imagen como frontend/public/images/products/{slug}.{webp|jpg}. */
    public Saved saveCard(String imageUrl, String slug) {
        BufferedImage source;
        try {
            byte[] bytes = fetcher.bytes(imageUrl);
            try (ByteArrayInputStream in = new ByteArrayInputStream(bytes)) {
                source = ImageIO.read(in);
            }
        } catch (Exception e) {
            log.warn("No se pudo descargar/leer {}: {}", imageUrl, e.getMessage());
            return null;
        }
        if (source == null) {
            log.warn("Formato de imagen no soportado: {}", imageUrl);
            return null;
        }

        int targetWidth = Math.min(CARD_WIDTH, source.getWidth());
        BufferedImage scaled;
        try {
            scaled = Thumbnails.of(source)
                    .width(targetWidth)
                    .keepAspectRatio(true)
                    .asBufferedImage();
        } catch (Exception e) {
            log.warn("No se pudo redimensionar {}: {}", imageUrl, e.getMessage());
            return null;
        }

        String format = webpAvailable ? "webp" : "jpg";
        String fileName = slug + "." + format;
        try {
            Path target = imagesDir.resolve(fileName);
            if (!ImageIO.write(scaled, format, target.toFile())) {
                throw new IllegalStateException("ImageIO no soporta " + format);
            }
            return new Saved(fileName, format, scaled.getWidth(), scaled.getHeight());
        } catch (Exception e) {
            log.warn("No se pudo guardar la imagen de {}: {}", imageUrl, e.getMessage());
            return null;
        }
    }
}
