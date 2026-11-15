-- =====================================================================
-- 01-schema.sql — Esquema de la tienda de merch de e-sports (MySQL 8)
--
-- Reglas:
--   * Idempotente: se puede ejecutar completo las veces que sea necesario.
--   * No modifica datos (el seed vive en 02-seed.sql).
--   * Motor InnoDB, utf8mb4.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS merch_shop
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_0900_ai_ci;

USE merch_shop;

-- ---------------------------------------------------------------------
-- Usuarios
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    email          VARCHAR(180)    NOT NULL,
    password_hash  VARCHAR(100)    NULL,
    display_name   VARCHAR(120)    NOT NULL,
    role           ENUM('CUSTOMER', 'ADMIN') NOT NULL DEFAULT 'CUSTOMER',
    provider       ENUM('LOCAL', 'GOOGLE')   NOT NULL DEFAULT 'LOCAL',
    provider_id    VARCHAR(120)    NULL,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_users_email (email),
    UNIQUE KEY uk_users_provider (provider, provider_id),
    KEY idx_users_role_active (role, active)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Juegos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(60)     NOT NULL,
    name           VARCHAR(120)    NOT NULL,
    accent_color   CHAR(7)         NOT NULL,
    display_order  INT             NOT NULL DEFAULT 0,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_games_slug (slug)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Equipos (dimensión ligada a un juego)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    game_id        BIGINT UNSIGNED NOT NULL,
    slug           VARCHAR(80)     NOT NULL,
    name           VARCHAR(120)    NOT NULL,
    logo_path      VARCHAR(500)    NULL,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_teams_game_slug (game_id, slug),
    KEY idx_teams_name (name),
    CONSTRAINT fk_teams_game FOREIGN KEY (game_id) REFERENCES games (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Categorías y subcategorías
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(80)     NOT NULL,
    name           VARCHAR(120)    NOT NULL,
    description    VARCHAR(500)    NULL,
    display_order  INT             NOT NULL DEFAULT 0,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_categories_slug (slug)
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS subcategories (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    category_id    BIGINT UNSIGNED NOT NULL,
    slug           VARCHAR(80)     NOT NULL,
    name           VARCHAR(120)    NOT NULL,
    display_order  INT             NOT NULL DEFAULT 0,
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_subcategories_category_slug (category_id, slug),
    CONSTRAINT fk_subcategories_category FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Productos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    slug           VARCHAR(160)    NOT NULL,
    name           VARCHAR(200)    NOT NULL,
    description    TEXT            NULL,
    game_id        BIGINT UNSIGNED NOT NULL,
    category_id    BIGINT UNSIGNED NOT NULL,
    subcategory_id BIGINT UNSIGNED NULL,
    team_id        BIGINT UNSIGNED NULL,
    price          DECIMAL(10, 2)  NOT NULL,
    currency       CHAR(3)         NOT NULL DEFAULT 'USD',
    active         TINYINT(1)      NOT NULL DEFAULT 1,
    featured       TINYINT(1)      NOT NULL DEFAULT 0,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_products_slug (slug),
    KEY idx_products_filters (game_id, category_id, subcategory_id, team_id),
    KEY idx_products_price (price),
    CONSTRAINT fk_products_game FOREIGN KEY (game_id) REFERENCES games (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
        ON DELETE RESTRICT,
    CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_products_team FOREIGN KEY (team_id) REFERENCES teams (id)
        ON DELETE SET NULL,
    CONSTRAINT chk_products_price CHECK (price >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Variantes (talla/color + stock)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_variants (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id     BIGINT UNSIGNED NOT NULL,
    sku            VARCHAR(64)     NOT NULL,
    size           VARCHAR(20)     NOT NULL DEFAULT 'UNICA',
    color          VARCHAR(40)     NOT NULL DEFAULT 'DEFAULT',
    price_delta    DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    stock          INT             NOT NULL DEFAULT 0,
    version        BIGINT          NOT NULL DEFAULT 0,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_variants_sku (sku),
    UNIQUE KEY uk_variants_product_size_color (product_id, size, color),
    CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE,
    CONSTRAINT chk_variants_stock CHECK (stock >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Imágenes de producto (siempre copia local, nunca hotlinking)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_images (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id     BIGINT UNSIGNED NOT NULL,
    source_url     VARCHAR(700)    NULL,
    storage_path   VARCHAR(500)    NOT NULL,
    checksum       CHAR(64)        NULL,
    kind           ENUM('THUMB', 'CARD', 'DETAIL') NOT NULL DEFAULT 'CARD',
    width          INT             NULL,
    height         INT             NULL,
    format         VARCHAR(10)     NOT NULL DEFAULT 'webp',
    is_primary     TINYINT(1)      NOT NULL DEFAULT 0,
    scraped_at     TIMESTAMP       NULL,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_images_product_primary (product_id, is_primary),
    KEY idx_images_checksum (checksum),
    CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Pedidos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id                          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    code                        VARCHAR(32)     NOT NULL,
    user_id                     BIGINT UNSIGNED NULL,
    customer_email              VARCHAR(180)    NOT NULL,
    status                      ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'EXPIRED')
                                                  NOT NULL DEFAULT 'PENDING',
    subtotal                    DECIMAL(10, 2)  NOT NULL,
    shipping_cost               DECIMAL(10, 2)  NOT NULL DEFAULT 0,
    total                       DECIMAL(10, 2)  NOT NULL,
    currency                    CHAR(3)         NOT NULL DEFAULT 'USD',
    stripe_payment_intent_id    VARCHAR(120)    NULL,
    reservation_expires_at      DATETIME        NULL,
    created_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_orders_code (code),
    UNIQUE KEY uk_orders_payment_intent (stripe_payment_intent_id),
    KEY idx_orders_user_created (user_id, created_at),
    KEY idx_orders_status_expires (status, reservation_expires_at),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE SET NULL,
    CONSTRAINT chk_orders_total CHECK (total >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Líneas de pedido: guardan copia del producto (el historial no se rompe)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id       BIGINT UNSIGNED NOT NULL,
    product_id     BIGINT UNSIGNED NULL,
    variant_id     BIGINT UNSIGNED NULL,
    product_name   VARCHAR(200)    NOT NULL,
    variant_label  VARCHAR(80)     NOT NULL DEFAULT '',
    unit_price     DECIMAL(10, 2)  NOT NULL,
    quantity       INT             NOT NULL,
    line_total     DECIMAL(10, 2)  NOT NULL,
    image_path     VARCHAR(500)    NULL,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_order_items_order (order_id),
    KEY idx_order_items_product (product_id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id)
        ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id)
        ON DELETE SET NULL,
    CONSTRAINT chk_order_items_quantity CHECK (quantity > 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Pagos
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    order_id             BIGINT UNSIGNED NOT NULL,
    provider             VARCHAR(40)     NOT NULL DEFAULT 'stripe',
    provider_payment_id  VARCHAR(120)    NOT NULL,
    status               VARCHAR(40)     NOT NULL,
    amount               DECIMAL(10, 2)  NOT NULL,
    currency             CHAR(3)         NOT NULL DEFAULT 'USD',
    raw_payload          JSON            NULL,
    created_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at           TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_payments_provider_id (provider, provider_payment_id),
    KEY idx_payments_order (order_id),
    CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Webhooks recibidos (idempotencia por id de evento del proveedor)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS webhook_events (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_id       VARCHAR(120)    NOT NULL,
    type           VARCHAR(80)     NOT NULL,
    payload        JSON            NULL,
    status         ENUM('RECEIVED', 'PROCESSED', 'FAILED') NOT NULL DEFAULT 'RECEIVED',
    attempts       INT             NOT NULL DEFAULT 0,
    processed_at   TIMESTAMP       NULL,
    created_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_webhook_events_event_id (event_id),
    KEY idx_webhook_events_status (status)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- Scraper: fuentes por producto y ejecuciones
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scrape_sources (
    id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    product_id      BIGINT UNSIGNED NOT NULL,
    url             VARCHAR(700)    NOT NULL,
    adapter         VARCHAR(60)     NOT NULL DEFAULT 'generic',
    selectors       JSON            NULL,
    active          TINYINT(1)      NOT NULL DEFAULT 1,
    last_scraped_at TIMESTAMP       NULL,
    created_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_scrape_sources_product_url (product_id, url),
    KEY idx_scrape_sources_active (active),
    CONSTRAINT fk_scrape_sources_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE CASCADE
) ENGINE = InnoDB;

CREATE TABLE IF NOT EXISTS scrape_runs (
    id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    source_id      BIGINT UNSIGNED NULL,
    product_id     BIGINT UNSIGNED NULL,
    status         ENUM('RUNNING', 'SUCCESS', 'PARTIAL', 'FAILED') NOT NULL DEFAULT 'RUNNING',
    started_at     TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    finished_at    TIMESTAMP       NULL,
    items_found    INT             NOT NULL DEFAULT 0,
    items_updated  INT             NOT NULL DEFAULT 0,
    items_failed   INT             NOT NULL DEFAULT 0,
    message        TEXT            NULL,
    PRIMARY KEY (id),
    KEY idx_scrape_runs_status_started (status, started_at),
    KEY idx_scrape_runs_product (product_id),
    CONSTRAINT fk_scrape_runs_source FOREIGN KEY (source_id) REFERENCES scrape_sources (id)
        ON DELETE SET NULL,
    CONSTRAINT fk_scrape_runs_product FOREIGN KEY (product_id) REFERENCES products (id)
        ON DELETE SET NULL
) ENGINE = InnoDB;
