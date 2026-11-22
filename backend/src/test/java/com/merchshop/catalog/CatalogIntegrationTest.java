package com.merchshop.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.anyOf;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import com.jayway.jsonpath.JsonPath;

/**
 * Catálogo público contra MySQL real: valida la acumulación de filtros, los
 * facets, la paginación/orden y el catálogo generado por el importador.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class CatalogIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("merch_shop");

    @Autowired
    private MockMvc mockMvc;

    @BeforeAll
    static void applySchemaAndSeed() throws Exception {
        try (Connection connection = DriverManager.getConnection(
                MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())) {
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/01-schema.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/02-seed.sql"));
            ScriptUtils.executeSqlScript(connection, new ClassPathResource("db/03-catalog.sql"));
        }
    }

    @Test
    void listadoSinFiltrosDevuelvePaginadoConRelacionesEImagen() throws Exception {
        mockMvc.perform(get("/api/catalog/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page").value(0))
                .andExpect(jsonPath("$.size").value(12))
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.totalPages", greaterThan(1)))
                .andExpect(jsonPath("$.items", hasSize(12)))
                .andExpect(jsonPath("$.items[0].slug").isNotEmpty())
                .andExpect(jsonPath("$.items[0].game.accentColor").isNotEmpty())
                .andExpect(jsonPath("$.items[0].category.name").isNotEmpty())
                .andExpect(jsonPath("$.items[0].imageUrl").isNotEmpty());
    }

    @Test
    void losFiltrosDeDistintosGruposSeAcumulan() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "cs2")
                        .param("category", "vestimenta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.items[*].game.slug", everyItem(is("cs2"))))
                .andExpect(jsonPath("$.items[*].category.slug", everyItem(is("vestimenta"))));

        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "cs2")
                        .param("category", "vestimenta")
                        .param("team", "fnatic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.items[*].team.slug", everyItem(is("fnatic"))));
    }

    @Test
    void valoresDelMismoGrupoSeCombinanConOr() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "league-of-legends", "valorant"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.items[*].game.slug",
                        everyItem(anyOf(is("league-of-legends"), is("valorant")))));
    }

    @Test
    void losFacetsFiltranLosEquiposPorJuego() throws Exception {
        mockMvc.perform(get("/api/catalog/facets").param("game", "valorant"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.games", hasSize(4)))
                .andExpect(jsonPath("$.categories", hasSize(3)))
                .andExpect(jsonPath("$.teams[*].slug", hasItems("sentinels", "team-liquid")))
                .andExpect(jsonPath("$.teams[*].slug", not(hasItems("t1", "fnatic"))));
    }

    @Test
    void sinJuegoSeleccionadoLosFacetsListanLosEquiposDelSeedYDelCatalogo() throws Exception {
        mockMvc.perform(get("/api/catalog/facets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teams[*].slug", hasItems(
                        "fnatic", "g2-esports", "t1", "sentinels", "team-liquid")))
                .andExpect(jsonPath("$.teams[*].slug", hasItems("mouz", "big", "the-mongolz")));
    }

    @Test
    void ordenaPorPrecioAscendenteYDescendente() throws Exception {
        List<Double> ascending = prices("price-asc");
        List<Double> descending = prices("price-desc");

        assertThat(ascending).isNotEmpty().isSorted();
        assertThat(descending).isNotEmpty().isSortedAccordingTo((a, b) -> Double.compare(b, a));
        assertThat(ascending.getFirst()).isLessThanOrEqualTo(descending.getFirst());
    }

    @Test
    void buscaPorNombreYDescripcion() throws Exception {
        mockMvc.perform(get("/api/catalog/products").param("q", "figura"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.items[*].slug", hasItems("k-da-akali-unlocked")));
    }

    @Test
    void respetaElTamanoDePaginaYPaginasFueraDeRango() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("size", "5")
                        .param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.totalPages", greaterThan(1)));

        mockMvc.perform(get("/api/catalog/products")
                        .param("size", "5")
                        .param("page", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.total", greaterThan(0)));
    }

    @Test
    void losPreciosNuncaSonNegativos() throws Exception {
        mockMvc.perform(get("/api/catalog/products").param("sort", "price-asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].price", everyItem(greaterThan(0.0))));
    }

    @Test
    void elDetalleDevuelveVariantesYPrecioFinal() throws Exception {
        mockMvc.perform(get("/api/catalog/products/g2-cs-pro-jersey-2024-black"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("g2-cs-pro-jersey-2024-black"))
                .andExpect(jsonPath("$.price").value(44.65))
                .andExpect(jsonPath("$.game.slug").value("cs2"))
                .andExpect(jsonPath("$.team.slug").value("g2-esports"))
                .andExpect(jsonPath("$.variants", hasSize(7)))
                .andExpect(jsonPath("$.variants[*].size",
                        contains("2XL", "3XL", "L", "M", "S", "XL", "XS")))
                .andExpect(jsonPath("$.variants[0].finalPrice").value(44.65))
                .andExpect(jsonPath("$.variants[0].available").value(true))
                .andExpect(jsonPath("$.images", hasSize(1)))
                .andExpect(jsonPath("$.images[0].path").value(
                        "/images/products/g2-cs-pro-jersey-2024-black.webp"));
    }

    @Test
    void elDetalleDeUnProductoInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/catalog/products/no-existe"))
                .andExpect(status().isNotFound());
    }

    private List<Double> prices(String sort) throws Exception {
        String body = mockMvc.perform(get("/api/catalog/products").param("sort", sort))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();
        List<Double> values = JsonPath.read(body, "$.items[*].price");
        return values.stream().map(Number::doubleValue).toList();
    }
}
