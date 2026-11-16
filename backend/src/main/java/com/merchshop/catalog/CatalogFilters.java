package com.merchshop.catalog;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/**
 * Filtros ya normalizados del catálogo. Los valores de cada grupo se combinan
 * con OR entre sí y con AND entre grupos, para que la selección se acumule.
 */
public record CatalogFilters(Set<String> games, Set<String> teams, Set<String> categories, String query) {

    private static final int MAX_QUERY_LENGTH = 80;

    public static CatalogFilters of(List<String> games, List<String> teams, List<String> categories, String query) {
        return new CatalogFilters(
                normalize(games),
                normalize(teams),
                normalize(categories),
                normalizeQuery(query));
    }

    private static Set<String> normalize(List<String> values) {
        if (values == null || values.isEmpty()) {
            return Set.of();
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(value -> value.trim().toLowerCase(Locale.ROOT))
                .collect(java.util.stream.Collectors.toCollection(java.util.LinkedHashSet::new));
    }

    private static String normalizeQuery(String query) {
        if (query == null || query.isBlank()) {
            return null;
        }
        String trimmed = query.trim().toLowerCase(Locale.ROOT);
        return trimmed.length() > MAX_QUERY_LENGTH ? trimmed.substring(0, MAX_QUERY_LENGTH) : trimmed;
    }
}
