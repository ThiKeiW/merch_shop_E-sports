package com.merchshop.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.http.MediaType.APPLICATION_JSON;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.datasource.init.ScriptUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

import tools.jackson.databind.ObjectMapper;

/**
 * CRUD de productos del panel admin contra MySQL real: autorización, alta,
 * edición con reemplazo de variantes e imágenes, validaciones y borrado lógico.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class AdminProductIntegrationTest {

    @Container
    @ServiceConnection
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4")
            .withDatabaseName("merch_shop");

    private static final String ADMIN_EMAIL = "admin@merchshop.dev";
    private static final String ADMIN_PASSWORD = "Admin1234!";
    private static final String CUSTOMER_EMAIL = "cliente@merchshop.dev";
    private static final String CUSTOMER_PASSWORD = "Cliente1234!";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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
    void elCatalogoAdminExigeRolAdministrador() throws Exception {
        mockMvc.perform(get("/api/admin/products")).andExpect(status().isUnauthorized());

        String token = login(CUSTOMER_EMAIL, CUSTOMER_PASSWORD);
        mockMvc.perform(get("/api/admin/products").header("Authorization", "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    @Test
    void elAdministradorListaElCatalogoConFiltrosYStock() throws Exception {
        String token = adminToken();

        mockMvc.perform(get("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .param("game", "cs2")
                        .param("active", "true")
                        .param("size", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(5)))
                .andExpect(jsonPath("$.total", greaterThan(0)))
                .andExpect(jsonPath("$.items[*].game", everyItem(is("cs2"))))
                .andExpect(jsonPath("$.items[*].active", everyItem(is(true))))
                .andExpect(jsonPath("$.items[0].imageUrl").isNotEmpty())
                .andExpect(jsonPath("$.items[0].stock", greaterThan(0)))
                .andExpect(jsonPath("$.items[0].variantCount", greaterThan(0)));

        mockMvc.perform(get("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .param("q", "g2-cs-pro"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].slug").value("g2-cs-pro-jersey-2024-black"));
    }

    @Test
    void losFacetsDelAdminIncluyenSubcategorias() throws Exception {
        mockMvc.perform(get("/api/admin/facets").header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.games", hasSize(4)))
                .andExpect(jsonPath("$.categories", hasSize(3)))
                .andExpect(jsonPath("$.categories[0].subcategories", hasSize(5)))
                .andExpect(jsonPath("$.teams[?(@.slug == 'fnatic')].name").isNotEmpty());
    }

    @Test
    void creaUnProductoConSlugAutomaticoVariantesEImagenPrincipal() throws Exception {
        String suffix = uniqueSuffix();
        Map<String, Object> payload = payload("Producto Admin " + suffix);
        payload.put("variants", List.of(
                variant("M", "Negro", 0, 5),
                variant("L", "Negro", 2.5, 3)));
        payload.put("images", List.of(
                image("/images/products/admin-test.webp", false),
                image("/images/products/admin-test-2.webp", true)));

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(payload)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.slug").value("producto-admin-" + suffix))
                .andExpect(jsonPath("$.game").value("cs2"))
                .andExpect(jsonPath("$.subcategory").value("jerseys"))
                .andExpect(jsonPath("$.team").value("fnatic"))
                .andExpect(jsonPath("$.active").value(true))
                .andExpect(jsonPath("$.variants", hasSize(2)))
                .andExpect(jsonPath("$.variants[0].sku").isNotEmpty())
                .andExpect(jsonPath("$.images", hasSize(2)))
                .andExpect(jsonPath("$.images[1].path").value("/images/products/admin-test-2.webp"))
                .andExpect(jsonPath("$.images[1].primary").value(true));
    }

    @Test
    void validaPrecioVariantesYJuego() throws Exception {
        Map<String, Object> payload = payload("Producto Inválido");
        payload.remove("game");
        payload.put("price", -1);
        payload.put("variants", List.of());

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(payload)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.game").isNotEmpty())
                .andExpect(jsonPath("$.fields.price").isNotEmpty())
                .andExpect(jsonPath("$.fields.variants").isNotEmpty());
    }

    @Test
    void rechazaVariantesDuplicadasYSubcategoriaAjena() throws Exception {
        Map<String, Object> duplicated = payload("Producto Duplicado");
        duplicated.put("variants", List.of(
                variant("M", "Negro", 0, 1),
                variant("m", "negro", 0, 2)));

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(duplicated)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("repetidos")));

        Map<String, Object> wrongSubcategory = payload("Producto Subcategoría");
        wrongSubcategory.put("category", "accesorios");
        wrongSubcategory.put("subcategory", "jerseys");

        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(wrongSubcategory)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("subcategoría")));
    }

    @Test
    void rechazaSkusRepetidosEntreProductos() throws Exception {
        String sku = "ADMIN-TEST-" + uniqueSuffix().toUpperCase();

        Map<String, Object> first = payload("Producto SKU Uno " + uniqueSuffix());
        first.put("variants", List.of(explicitSkuVariant(sku)));
        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(first)))
                .andExpect(status().isCreated());

        Map<String, Object> second = payload("Producto SKU Dos " + uniqueSuffix());
        second.put("variants", List.of(explicitSkuVariant(sku)));
        mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + adminToken())
                        .contentType(APPLICATION_JSON)
                        .content(json(second)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("ya pertenece")));
    }

    @Test
    void actualizaProductoReemplazandoVariantesEImagenes() throws Exception {
        String suffix = uniqueSuffix();
        String token = adminToken();

        MvcResult created = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(json(payload("Producto Editable " + suffix))))
                .andExpect(status().isCreated())
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        String originalSlug = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("slug").asText();

        Map<String, Object> update = payload("Producto Editado " + suffix);
        update.put("slug", null);
        update.put("price", 59.9);
        update.put("featured", true);
        update.put("variants", List.of(
                variant("S", "Blanco", 0, 4),
                variant("M", "Blanco", 0, 6),
                variant("L", "Blanco", 1, 2)));
        update.put("images", List.of(image("/images/products/admin-edited.webp", true)));

        mockMvc.perform(put("/api/admin/products/" + id)
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(json(update)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.slug").value(originalSlug))
                .andExpect(jsonPath("$.name").value("Producto Editado " + suffix))
                .andExpect(jsonPath("$.price").value(59.9))
                .andExpect(jsonPath("$.featured").value(true))
                .andExpect(jsonPath("$.variants", hasSize(3)))
                .andExpect(jsonPath("$.images", hasSize(1)))
                .andExpect(jsonPath("$.images[0].path").value("/images/products/admin-edited.webp"));

        mockMvc.perform(get("/api/admin/products/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants", hasSize(3)))
                .andExpect(jsonPath("$.images", hasSize(1)));
    }

    @Test
    void elBorradoEsLogicoYOcultaElProductoDelCatalogo() throws Exception {
        String suffix = uniqueSuffix();
        String token = adminToken();

        MvcResult created = mockMvc.perform(post("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .contentType(APPLICATION_JSON)
                        .content(json(payload("Producto Borrable " + suffix))))
                .andExpect(status().isCreated())
                .andReturn();

        long id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asLong();
        String slug = objectMapper.readTree(created.getResponse().getContentAsString())
                .get("slug").asText();

        mockMvc.perform(delete("/api/admin/products/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/admin/products/" + id).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active").value(false));

        mockMvc.perform(get("/api/catalog/products/" + slug))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/admin/products")
                        .header("Authorization", "Bearer " + token)
                        .param("q", "producto-borrable-" + suffix))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].active").value(false));
    }

    @Test
    void elDetalleDeUnProductoInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/admin/products/999999")
                        .header("Authorization", "Bearer " + adminToken()))
                .andExpect(status().isNotFound());
    }

    private Map<String, Object> payload(String name) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("name", name);
        payload.put("description", "Producto creado desde la suite de pruebas");
        payload.put("game", "cs2");
        payload.put("category", "vestimenta");
        payload.put("subcategory", "jerseys");
        payload.put("team", "fnatic");
        payload.put("price", 39.99);
        payload.put("currency", "EUR");
        payload.put("featured", false);
        payload.put("active", true);
        payload.put("variants", List.of(variant("M", "Negro", 0, 5)));
        payload.put("images", List.of(image("/images/products/admin-test.webp", true)));
        return payload;
    }

    private Map<String, Object> variant(String size, String color, double priceDelta, int stock) {
        Map<String, Object> variant = new LinkedHashMap<>();
        variant.put("size", size);
        variant.put("color", color);
        variant.put("priceDelta", priceDelta);
        variant.put("stock", stock);
        return variant;
    }

    private Map<String, Object> explicitSkuVariant(String sku) {
        Map<String, Object> variant = variant("M", "Negro", 0, 1);
        variant.put("sku", sku);
        return variant;
    }

    private Map<String, Object> image(String path, boolean primary) {
        Map<String, Object> image = new LinkedHashMap<>();
        image.put("path", path);
        image.put("kind", "CARD");
        image.put("primary", primary);
        return image;
    }

    private String json(Object value) throws Exception {
        return objectMapper.writeValueAsString(value);
    }

    private String adminToken() throws Exception {
        return login(ADMIN_EMAIL, ADMIN_PASSWORD);
    }

    private String login(String email, String password) throws Exception {
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(APPLICATION_JSON)
                        .content(json(Map.of("email", email, "password", password))))
                .andExpect(status().isOk())
                .andReturn()
                .getResponse()
                .getContentAsString();

        return objectMapper.readTree(body).get("token").asText();
    }

    private static String uniqueSuffix() {
        return UUID.randomUUID().toString().substring(0, 8);
    }
}
