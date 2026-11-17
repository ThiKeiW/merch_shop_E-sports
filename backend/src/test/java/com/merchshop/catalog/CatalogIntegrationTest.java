package com.merchshop.catalog;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.DriverManager;

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

/**
 * Catálogo público contra MySQL real: valida la acumulación de filtros, los
 * facets y la paginación/orden usando el mismo esquema y seed de Docker.
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
        }
    }

    @Test
    void listadoSinFiltrosDevuelvePaginadoConRelaciones() throws Exception {
        mockMvc.perform(get("/api/catalog/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.items", hasSize(greaterThan(0))))
                .andExpect(jsonPath("$.items[0].slug").isNotEmpty())
                .andExpect(jsonPath("$.items[0].game.accentColor").isNotEmpty())
                .andExpect(jsonPath("$.items[0].category.name").isNotEmpty());
    }

    @Test
    void losFiltrosDeDistintosGruposSeAcumulan() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "league-of-legends")
                        .param("category", "vestimenta"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.items[*].slug", hasItems(
                        "jersey-t1-2024", "gorra-fnatic-2024", "poleron-g2-esports")));

        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "league-of-legends")
                        .param("category", "vestimenta")
                        .param("team", "fnatic"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[*].slug", contains("gorra-fnatic-2024")));
    }

    @Test
    void valoresDelMismoGrupoSeCombinanConOr() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("game", "league-of-legends", "valorant"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(6));
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
    void sinJuegoSeleccionadoLosFacetsListanTodosLosEquipos() throws Exception {
        mockMvc.perform(get("/api/catalog/facets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.teams", hasSize(9)));
    }

    @Test
    void ordenaPorPrecioAscendenteYDescendente() throws Exception {
        mockMvc.perform(get("/api/catalog/products").param("sort", "price-asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].price").value(14.99));

        mockMvc.perform(get("/api/catalog/products").param("sort", "price-desc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].price").value(74.99));
    }

    @Test
    void buscaPorNombreYDescripcion() throws Exception {
        mockMvc.perform(get("/api/catalog/products").param("q", "figura"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.items[*].slug", hasItems(
                        "figura-team-spirit-aegis", "figura-navi-major")));
    }

    @Test
    void respetaElTamanoDePaginaYPaginasFueraDeRango() throws Exception {
        mockMvc.perform(get("/api/catalog/products")
                        .param("size", "5")
                        .param("page", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.totalPages").value(3));

        mockMvc.perform(get("/api/catalog/products").param("page", "99"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(0)))
                .andExpect(jsonPath("$.total").value(12));
    }

    @Test
    void losPreciosNuncaSonNegativos() throws Exception {
        mockMvc.perform(get("/api/catalog/products").param("sort", "price-asc"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[*].price", everyItem(greaterThan(0.0))));
    }

    @Test
    void elDetalleDevuelveVariantesYPrecioFinal() throws Exception {
        mockMvc.perform(get("/api/catalog/products/jersey-t1-2024"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.slug").value("jersey-t1-2024"))
                .andExpect(jsonPath("$.price").value(69.99))
                .andExpect(jsonPath("$.game.slug").value("league-of-legends"))
                .andExpect(jsonPath("$.team.slug").value("t1"))
                .andExpect(jsonPath("$.variants", hasSize(3)))
                .andExpect(jsonPath("$.variants[*].size", contains("L", "M", "S")))
                .andExpect(jsonPath("$.variants[0].finalPrice").value(69.99))
                .andExpect(jsonPath("$.variants[0].available").value(true))
                .andExpect(jsonPath("$.images", hasSize(0)));
    }

    @Test
    void elDetalleDeUnProductoInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/catalog/products/no-existe"))
                .andExpect(status().isNotFound());
    }
}
