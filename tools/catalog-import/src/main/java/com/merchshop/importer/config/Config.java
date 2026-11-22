package com.merchshop.importer.config;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

/**
 * Configuracion del importador de una sola ejecucion.
 *
 * <p>Las reglas de clasificacion son las mismas que se validaron en la fase de
 * scraping (regex case-insensitive sobre tags + nombre + tipo + vendor), pero
 * aqui los ids/slugs son los del seed fijo de dimensiones (games, categories,
 * subcategories y equipos ya existentes).</p>
 */
public final class Config {

    public static final String USER_AGENT =
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

    /** Ids de juegos del seed (db/02-seed.sql). */
    public static final Map<String, Long> GAME_IDS = Map.of(
            "league-of-legends", 1L,
            "valorant", 2L,
            "cs2", 3L,
            "dota-2", 4L);

    /** Ids de categorias del seed. */
    public static final Map<String, Long> CATEGORY_IDS = Map.of(
            "vestimenta", 1L,
            "accesorios", 2L,
            "coleccionables", 3L);

    /** subcategoria -> [id, categoria]. */
    public static final Map<String, Subcategory> SUBCATEGORIES = Map.ofEntries(
            Map.entry("jerseys", new Subcategory(1L, "vestimenta")),
            Map.entry("polos", new Subcategory(2L, "vestimenta")),
            Map.entry("polerones", new Subcategory(3L, "vestimenta")),
            Map.entry("chaquetas", new Subcategory(4L, "vestimenta")),
            Map.entry("gorras", new Subcategory(5L, "vestimenta")),
            Map.entry("mousepads", new Subcategory(6L, "accesorios")),
            Map.entry("mochilas", new Subcategory(7L, "accesorios")),
            Map.entry("tazas-y-botellas", new Subcategory(8L, "accesorios")),
            Map.entry("llaveros-y-pines", new Subcategory(9L, "accesorios")),
            Map.entry("posters-y-banderas", new Subcategory(10L, "accesorios")),
            Map.entry("figuras", new Subcategory(11L, "coleccionables")),
            Map.entry("peluches", new Subcategory(12L, "coleccionables")),
            Map.entry("trading-cards", new Subcategory(13L, "coleccionables")),
            Map.entry("replicas-y-trofeos", new Subcategory(14L, "coleccionables")),
            Map.entry("ediciones-limitadas", new Subcategory(15L, "coleccionables")));

    /** Equipos ya presentes en el seed: slug -> [id, gameId, nombre]. */
    public static final Map<String, SeedTeam> SEED_TEAMS = Map.of(
            "t1", new SeedTeam(1L, 1L, "T1"),
            "g2-esports", new SeedTeam(2L, 1L, "G2 Esports"),
            "fnatic", new SeedTeam(3L, 1L, "Fnatic"),
            "sentinels", new SeedTeam(4L, 2L, "Sentinels"),
            "team-liquid", new SeedTeam(5L, 2L, "Team Liquid"),
            "natus-vincere", new SeedTeam(6L, 3L, "Natus Vincere"),
            "faze-clan", new SeedTeam(7L, 3L, "FaZe Clan"),
            "team-spirit", new SeedTeam(8L, 4L, "Team Spirit"),
            "gaimin-gladiators", new SeedTeam(9L, 4L, "Gaimin Gladiators"));

    /** regex -> slug de juego. */
    public static final Map<String, String> GAME_RULES = ordered(
            "(?:valorant)", "valorant",
            "(?:league[- ]?of[- ]?legends|arcane|k-?da|pentakill|true[- ]?damage|heartsteel|hall[- ]?of[- ]?legends)", "league-of-legends",
            "(?:dota)", "dota-2",
            "(?:counter[- ]?strike|\\bcs2\\b|\\bcsgo\\b)", "cs2");

    /** regex -> slug de subcategoria (la categoria sale de SUBCATEGORIES). */
    public static final Map<String, String> SUBCATEGORY_RULES = ordered(
            "(?:jersey)", "jerseys",
            "(?:\\bpolo\\b)", "polos",
            "(?:hoodie|sweatshirt|sudadera|buzo|crewneck|zip[- ]?up|pullover)", "polerones",
            "(?:jacket|chaqueta|windbreaker)", "chaquetas",
            "(?:\\bcap\\b|gorra|beanie|snapback|headwear|\\bhat\\b)", "gorras",
            "(?:mousepad|desk[- ]?mat|mouse ?pad)", "mousepads",
            "(?:backpack|mochila|\\bbag\\b)", "mochilas",
            "(?:\\bmug\\b|taza|bottle|botella|tumbler)", "tazas-y-botellas",
            "(?:keychain|llavero|\\bpin\\b|pin set|\\bpatch\\b)", "llaveros-y-pines",
            "(?:poster|banner|bandera|\\bflag\\b)", "posters-y-banderas",
            "(?:\\bfigures?\\b|\\bfiguras?\\b|\\bstatues?\\b|statuette)", "figuras",
            "(?:plush|peluche)", "peluches",
            "(?:trading[- ]?card|collectible card|card pack|deck box)", "trading-cards",
            "(?:replica|trophy|trofeo)", "replicas-y-trofeos",
            "(?:limited|edicion|edition)", "ediciones-limitadas");

    /**
     * regex que descarta el producto: IPs fuera del catalogo y articulos que no
     * son merch (muebles, PCs, productos digitales, suplementos...).
     */
    public static final List<String> SKIP_RULES = List.of(
            "riftbound", "2xko",
            "steelcase|chillblast|gymbeam|nootropic|gaming powder",
            "spare part|\\bmonitor\\b|\\bchair\\b",
            "in-game|digital content",
            "\\bmagnet\\b|\\bkeycap\\b",
            "cologne|beef jerky|\\bsnack\\b",
            "gaming mouse|headset|sound ?card|ear pads|keyboard|webcam",
            "\\bled\\b|light ?stick|hand towel|\\bglove\\b");

    /** Reglas de equipo (whitelist): los no listados se descartan en tiendas con requireTeam. */
    public static final List<TeamRule> TEAM_RULES = List.of(
            new TeamRule("fnatic", "Fnatic", "fnatic", "league-of-legends"),
            new TeamRule("natus-vincere", "Natus Vincere", "natus[- ]?vincere|\\bnavi\\b", "cs2"),
            new TeamRule("faze-clan", "FaZe Clan", "\\bfaze\\b", "cs2"),
            new TeamRule("team-liquid", "Team Liquid", "team[- ]?liquid", "cs2"),
            new TeamRule("g2-esports", "G2 Esports", "\\bg2\\b", "league-of-legends"),
            new TeamRule("t1", "T1", "\\bt1\\b", "league-of-legends"),
            new TeamRule("sentinels", "Sentinels", "sentinels", "valorant"),
            new TeamRule("team-spirit", "Team Spirit", "team[- ]?spirit", "dota-2"),
            new TeamRule("gaimin-gladiators", "Gaimin Gladiators", "gaimin", "dota-2"),
            new TeamRule("team-vitality", "Team Vitality", "\\bvitality\\b", "cs2"),
            new TeamRule("mouz", "MOUZ", "\\bmouz\\b|mousesports", "cs2"),
            new TeamRule("astralis", "Astralis", "astralis", "cs2"),
            new TeamRule("heroic", "Heroic", "\\bheroic\\b", "cs2"),
            new TeamRule("cloud9", "Cloud9", "cloud9|\\bc9\\b", "cs2"),
            new TeamRule("big", "BIG", "\\bbig\\b", "cs2"),
            new TeamRule("virtus-pro", "Virtus.pro", "virtus[- ]?pro|\\bvp\\b", "cs2"),
            new TeamRule("furia", "FURIA", "furia", "cs2"),
            new TeamRule("complexity", "Complexity", "complexity", "cs2"),
            new TeamRule("eternal-fire", "Eternal Fire", "eternal[- ]?fire", "cs2"),
            new TeamRule("the-mongolz", "The MongolZ", "mongolz", "cs2"));

    /**
     * Las tiendas no publican stock real (Fnatic y ESL marcan casi todo como
     * agotado), asi que el stock de las variantes es sintetico y se documenta en
     * la cabecera del SQL.
     */
    public static final Site FNATIC = new Site(
            "fnatic", "shopify", "https://shop.fnatic.com", null,
            "EUR", "cs2", "fnatic", "vestimenta", false, false, 1.0);

    /**
     * shop.esl.com publica TODO el catalogo con available=false (no gestiona
     * inventario en su JSON publico) y sus precios vienen en PLN. Se convierte
     * a EUR con una tasa fija documentada para el catalogo de demostracion.
     */
    public static final double PLN_TO_EUR = 1.0 / 4.30;

    public static final Site ESL = new Site(
            "esl", "shopify", "https://shop.esl.com", null,
            "EUR", "cs2", null, "vestimenta", true, false, PLN_TO_EUR);

    public static final Site RIOT = new Site(
            "riot", "riot", "https://merch.riotgames.com", "https://merch.riotgames.com/sitemap.xml",
            "EUR", null, null, "vestimenta", false, true, 1.0);

    private Config() {
    }

    public static List<Site> sites() {
        return List.of(FNATIC, ESL, RIOT);
    }

    public static Site site(String key) {
        return sites().stream()
                .filter(site -> site.key().equalsIgnoreCase(key))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Sitio desconocido: " + key));
    }

    /** Primer valor cuyo regex matchee alguna senal. */
    public static String firstMatch(Map<String, String> rules, List<String> signals, String hint) {
        for (Map.Entry<String, String> rule : rules.entrySet()) {
            if (matches(rule.getKey(), signals, hint)) {
                return rule.getValue();
            }
        }
        return null;
    }

    public static boolean matches(String regex, List<String> signals, String hint) {
        Pattern pattern = Pattern.compile(regex, Pattern.CASE_INSENSITIVE);
        if (hint != null && pattern.matcher(hint).find()) {
            return true;
        }
        for (String signal : signals) {
            if (signal != null && pattern.matcher(signal).find()) {
                return true;
            }
        }
        return false;
    }

    private static Map<String, String> ordered(String... pairs) {
        Map<String, String> map = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) {
            map.put(pairs[i], pairs[i + 1]);
        }
        return map;
    }

    public record Subcategory(Long id, String categorySlug) {
    }

    public record SeedTeam(Long id, Long gameId, String name) {
    }

    public record TeamRule(String slug, String name, String pattern, String fallbackGame) {
    }

    /** Tienda de origen. */
    public record Site(
            String key,
            String adapter,
            String baseUrl,
            String sitemapUrl,
            String currency,
            String defaultGame,
            String defaultTeam,
            String defaultCategory,
            boolean requireTeam,
            boolean requireAvailability,
            double priceFactor) {
    }
}
