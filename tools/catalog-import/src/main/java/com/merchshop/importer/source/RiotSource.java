package com.merchshop.importer.source;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.merchshop.importer.config.Config;
import com.merchshop.importer.fetch.CachedFetcher;
import com.merchshop.importer.model.ScrapedProduct;

/**
 * Fuente merch.riotgames.com. Descubrimiento por sitemap; el sitemap publica
 * las URLs canonicas /product/{slug}/ (sin prefijo de idioma), que era el bug
 * del scraper anterior.
 */
public final class RiotSource {

    private static final Logger log = LoggerFactory.getLogger(RiotSource.class);
    private static final Pattern LOC = Pattern.compile("<loc>(https://merch\\.riotgames\\.com/product/[^<]+)</loc>");

    private final CachedFetcher fetcher;
    private final ObjectMapper mapper;

    public RiotSource(CachedFetcher fetcher, ObjectMapper mapper) {
        this.fetcher = fetcher;
        this.mapper = mapper;
    }

    public List<String> discover(Config.Site site) throws Exception {
        String sitemap = fetcher.text(site.sitemapUrl());
        Set<String> urls = new LinkedHashSet<>();
        Matcher matcher = LOC.matcher(sitemap);
        while (matcher.find()) {
            urls.add(matcher.group(1));
        }
        log.info("[{}] sitemap: {} productos descubiertos", site.key(), urls.size());
        return new ArrayList<>(urls);
    }

    public ScrapedProduct fetch(String url) throws Exception {
        String html = fetcher.text(url);
        JsonNode product = RiotRscParser.productNode(html, mapper);
        if (product == null) {
            throw new IllegalStateException("Payload RSC sin producto en " + url);
        }
        return RiotRscParser.toScrapedProduct(product, url);
    }
}
