package com.merchshop.importer.fetch;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Cliente HTTP con cache en disco y cortesia con las tiendas (throttle +
 * backoff ante 429/503). La cache permite re-ejecutar el importador sin volver
 * a golpear los sitios; basta borrar tools/catalog-import/.cache para refrescar.
 */
public final class CachedFetcher {

    private static final Logger log = LoggerFactory.getLogger(CachedFetcher.class);

    private final HttpClient client;
    private final Path cacheDir;
    private final long throttleMs;
    private long lastNetworkAt;
    private int networkRequests;
    private int cacheHits;

    public CachedFetcher(Path cacheDir, long throttleMs) throws IOException {
        this.cacheDir = cacheDir;
        this.throttleMs = throttleMs;
        Files.createDirectories(cacheDir);
        this.client = HttpClient.newBuilder()
                .followRedirects(HttpClient.Redirect.NORMAL)
                .connectTimeout(Duration.ofSeconds(20))
                .build();
    }

    public String text(String url) throws IOException, InterruptedException {
        return new String(bytes(url), StandardCharsets.UTF_8);
    }

    public byte[] bytes(String url) throws IOException, InterruptedException {
        Path cached = cacheDir.resolve(key(url) + ".bin");
        if (Files.exists(cached) && Files.size(cached) > 0) {
            cacheHits++;
            return Files.readAllBytes(cached);
        }

        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .timeout(Duration.ofSeconds(45))
                .header("User-Agent", com.merchshop.importer.config.Config.USER_AGENT)
                .header("Accept", "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8")
                .header("Accept-Language", "es-ES,es;q=0.9,en;q=0.8")
                .GET()
                .build();

        for (int attempt = 1; attempt <= 5; attempt++) {
            throttle();
            HttpResponse<byte[]> response = client.send(request, HttpResponse.BodyHandlers.ofByteArray());
            int status = response.statusCode();
            if (status == 429 || status == 503) {
                long wait = retryAfterMillis(response).orElse(20_000L * attempt);
                log.warn("HTTP {} en {} (intento {}). Esperando {}s", status, url, attempt, wait / 1000);
                Thread.sleep(wait);
                continue;
            }
            if (status >= 400) {
                throw new IOException("HTTP " + status + " al pedir " + url);
            }
            byte[] body = response.body();
            if (body == null || body.length == 0) {
                throw new IOException("Respuesta vacia al pedir " + url);
            }
            Files.write(cached, body);
            networkRequests++;
            return body;
        }
        throw new IOException("Demasiados 429/503 al pedir " + url);
    }

    public String stats() {
        return "red=" + networkRequests + ", cache=" + cacheHits;
    }

    private void throttle() throws InterruptedException {
        long wait = throttleMs - (System.currentTimeMillis() - lastNetworkAt);
        if (wait > 0) {
            Thread.sleep(wait);
        }
        lastNetworkAt = System.currentTimeMillis();
    }

    private static Optional<Long> retryAfterMillis(HttpResponse<?> response) {
        return response.headers().firstValue("Retry-After").flatMap(raw -> {
            try {
                return Optional.of(Long.parseLong(raw.trim()) * 1000L);
            } catch (NumberFormatException e) {
                try {
                    Instant when = Instant.parse(raw.trim());
                    long millis = Duration.between(Instant.now(), when).toMillis();
                    return Optional.of(Math.max(millis, 5_000L));
                } catch (Exception ignored) {
                    return Optional.empty();
                }
            }
        });
    }

    private static String key(String url) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(url.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.substring(0, 40);
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
