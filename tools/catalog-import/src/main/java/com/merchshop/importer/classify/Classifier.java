package com.merchshop.importer.classify;

import java.util.ArrayList;
import java.util.List;

import com.merchshop.importer.config.Config;
import com.merchshop.importer.model.ScrapedProduct;

/**
 * Clasificacion del producto (juego, equipo, categoria/subcategoria) usando las
 * reglas validadas en la fase anterior. Devuelve un motivo cuando descarta el
 * producto para que el reporte explique el embudo por tienda.
 */
public final class Classifier {

    private Classifier() {
    }

    public record Classification(
            String gameSlug,
            String categorySlug,
            String subcategorySlug,
            String teamSlug,
            String teamName,
            String skipReason) {

        public boolean accepted() {
            return skipReason == null;
        }
    }

    public static Classification classify(ScrapedProduct product, Config.Site site) {
        List<String> primary = primarySignalsOf(product);
        List<String> secondary = secondarySignalsOf(product);

        for (String regex : Config.SKIP_RULES) {
            if (Config.matches(regex, primary, null) || Config.matches(regex, secondary, null)) {
                return reject("descartado por regla skip: " + regex);
            }
        }

        String game = gameOf(product, site, primary, secondary);
        if (game == null) {
            return reject("sin juego determinable");
        }

        String category = null;
        String subcategory = null;
        String subcategorySlug = Config.firstMatch(Config.SUBCATEGORY_RULES, primary, null);
        if (subcategorySlug == null) {
            subcategorySlug = Config.firstMatch(Config.SUBCATEGORY_RULES, secondary, null);
        }
        if (subcategorySlug != null) {
            Config.Subcategory sc = Config.SUBCATEGORIES.get(subcategorySlug);
            if (sc != null) {
                category = sc.categorySlug();
                subcategory = subcategorySlug;
            }
        }
        if (category == null) {
            category = site.defaultCategory();
        }

        TeamMatch team = teamOf(product, site, primary, secondary);
        if (site.requireTeam() && team == null) {
            return reject("sin equipo de la whitelist");
        }

        return new Classification(game, category, subcategory,
                team == null ? null : team.slug(),
                team == null ? null : team.name(),
                null);
    }

    private static String gameOf(ScrapedProduct product, Config.Site site,
                                 List<String> primary, List<String> secondary) {
        String hint = product.gameHint();
        if (hint != null) {
            String normalized = hint.toLowerCase();
            if (Config.GAME_IDS.containsKey(normalized)) {
                return normalized;
            }
        }
        String byRule = Config.firstMatch(Config.GAME_RULES, primary, null);
        if (byRule == null) {
            byRule = Config.firstMatch(Config.GAME_RULES, secondary, hint);
        }
        if (byRule != null) {
            return byRule;
        }
        return site.defaultGame();
    }

    private record TeamMatch(String slug, String name) {
    }

    private static TeamMatch teamOf(ScrapedProduct product, Config.Site site,
                                    List<String> primary, List<String> secondary) {
        TeamMatch match = teamMatch(primary);
        if (match == null) {
            match = teamMatch(secondary);
        }
        if (match != null) {
            return match;
        }
        if (site.defaultTeam() != null) {
            Config.SeedTeam seed = Config.SEED_TEAMS.get(site.defaultTeam());
            if (seed != null) {
                return new TeamMatch(site.defaultTeam(), seed.name());
            }
            for (Config.TeamRule rule : Config.TEAM_RULES) {
                if (rule.slug().equals(site.defaultTeam())) {
                    return new TeamMatch(rule.slug(), rule.name());
                }
            }
        }
        return null;
    }

    private static TeamMatch teamMatch(List<String> signals) {
        for (Config.TeamRule rule : Config.TEAM_RULES) {
            if (Config.matches(rule.pattern(), signals, null)) {
                Config.SeedTeam seed = Config.SEED_TEAMS.get(rule.slug());
                String name = seed != null ? seed.name() : rule.name();
                return new TeamMatch(rule.slug(), name);
            }
        }
        return null;
    }

    /**
     * Nombre, tipo y handle: la senal mas fiable. Las tiendas Shopify etiquetan
     * con tags sucios (una chaqueta con la etiqueta "Jerseys"), por eso los tags
     * quedan como respaldo y nunca pisan lo que dice el titulo.
     */
    private static List<String> primarySignalsOf(ScrapedProduct product) {
        List<String> signals = new ArrayList<>();
        if (product.name() != null) {
            signals.add(product.name());
        }
        if (product.productType() != null) {
            signals.add(product.productType());
        }
        if (product.handle() != null) {
            signals.add(product.handle().replace('-', ' '));
        }
        return signals;
    }

    private static List<String> secondarySignalsOf(ScrapedProduct product) {
        List<String> signals = new ArrayList<>(product.tags());
        if (product.vendor() != null) {
            signals.add(product.vendor());
        }
        return signals;
    }

    private static Classification reject(String reason) {
        return new Classification(null, null, null, null, null, reason);
    }
}
