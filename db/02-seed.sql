-- =====================================================================
-- 02-seed.sql — Datos semilla (idempotente, INSERT IGNORE)
--
-- Los ids son explícitos para que el seed sea reproducible; los productos
-- de ejemplo existen solo para validar filtros y relaciones.
-- =====================================================================

USE merch_shop;

-- ---------------------------------------------------------------------
-- Juegos (paleta acordada en el plan)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO games (id, slug, name, accent_color, display_order) VALUES
    (1, 'league-of-legends', 'League of Legends', '#0AC8B9', 1),
    (2, 'valorant',          'Valorant',          '#FF4655', 2),
    (3, 'cs2',               'Counter-Strike 2',  '#F5A623', 3),
    (4, 'dota-2',            'Dota 2',            '#9B1B30', 4);

-- ---------------------------------------------------------------------
-- Equipos
-- ---------------------------------------------------------------------
INSERT IGNORE INTO teams (id, game_id, slug, name) VALUES
    (1, 1, 't1',                  'T1'),
    (2, 1, 'g2-esports',          'G2 Esports'),
    (3, 1, 'fnatic',              'Fnatic'),
    (4, 2, 'sentinels',           'Sentinels'),
    (5, 2, 'team-liquid',         'Team Liquid'),
    (6, 3, 'natus-vincere',       'Natus Vincere'),
    (7, 3, 'faze-clan',           'FaZe Clan'),
    (8, 4, 'team-spirit',         'Team Spirit'),
    (9, 4, 'gaimin-gladiators',   'Gaimin Gladiators');

-- ---------------------------------------------------------------------
-- Categorías
-- ---------------------------------------------------------------------
INSERT IGNORE INTO categories (id, slug, name, description, display_order) VALUES
    (1, 'vestimenta',    'Vestimenta',    'Jerseys, polos, polerones, chaquetas y gorras.', 1),
    (2, 'accesorios',    'Accesorios',    'Mousepads, mochilas, tazas, llaveros y pósters.', 2),
    (3, 'coleccionables','Coleccionables','Figuras, peluches, trading cards y ediciones limitadas.', 3);

-- ---------------------------------------------------------------------
-- Subcategorías
-- ---------------------------------------------------------------------
INSERT IGNORE INTO subcategories (id, category_id, slug, name, display_order) VALUES
    (1,  1, 'jerseys',              'Jerseys',               1),
    (2,  1, 'polos',                'Polos',                 2),
    (3,  1, 'polerones',            'Polerones',             3),
    (4,  1, 'chaquetas',            'Chaquetas',             4),
    (5,  1, 'gorras',               'Gorras',                5),
    (6,  2, 'mousepads',            'Mousepads',             1),
    (7,  2, 'mochilas',             'Mochilas',              2),
    (8,  2, 'tazas-y-botellas',     'Tazas y botellas',      3),
    (9,  2, 'llaveros-y-pines',     'Llaveros y pines',      4),
    (10, 2, 'posters-y-banderas',   'Pósters y banderas',    5),
    (11, 3, 'figuras',              'Figuras',               1),
    (12, 3, 'peluches',             'Peluches',              2),
    (13, 3, 'trading-cards',        'Trading cards',         3),
    (14, 3, 'replicas-y-trofeos',   'Réplicas y trofeos',    4),
    (15, 3, 'ediciones-limitadas',  'Ediciones limitadas',   5);

-- ---------------------------------------------------------------------
-- Productos de ejemplo (sin imágenes todavía: llegan con el scraper)
-- ---------------------------------------------------------------------
INSERT IGNORE INTO products
    (id, slug, name, description, game_id, category_id, subcategory_id, team_id, price, currency, featured)
VALUES
    (1, 'jersey-t1-2024', 'Jersey T1 2024',
     'Jersey oficial de T1 para la temporada 2024, tela transpirable y corte unisex.',
     1, 1, 1, 1, 69.99, 'USD', 1),
    (2, 'mousepad-sentinels-vandal', 'Mousepad Sentinels Vandal',
     'Mousepad extendido con superficie de precisión y base antideslizante.',
     2, 2, 6, 4, 29.99, 'USD', 1),
    (3, 'figura-team-spirit-aegis', 'Figura Team Spirit Aegis',
     'Figura coleccionable edición limitada del Team Spirit.',
     4, 3, 11, 8, 49.99, 'USD', 0),
    (4, 'gorra-fnatic-2024', 'Gorra Fnatic 2024',
     'Gorra ajustable con bordado de Fnatic, pensada para el día a día.',
     1, 1, 5, 3, 24.99, 'USD', 1),
    (5, 'poleron-g2-esports', 'Polerón G2 Esports',
     'Polerón de algodón con capucha y escudo de G2 Esports al pecho.',
     1, 1, 3, 2, 59.99, 'USD', 0),
    (6, 'mousepad-team-liquid', 'Mousepad Team Liquid',
     'Mousepad de gran formato con base de goma y borde cosido.',
     2, 2, 6, 5, 27.99, 'USD', 0),
    (7, 'mochila-sentinels', 'Mochila Sentinels',
     'Mochila de 25 litros con compartimento para notebook y detalles de Sentinels.',
     2, 2, 7, 4, 44.99, 'USD', 1),
    (8, 'figura-navi-major', 'Figura NAVI Major',
     'Figura de colección inspirada en el título Major de Natus Vincere.',
     3, 3, 11, 6, 54.99, 'USD', 1),
    (9, 'jersey-faze-2024', 'Jersey FaZe Clan 2024',
     'Jersey de temporada de FaZe Clan con tejido ligero y corte competitivo.',
     3, 1, 1, 7, 74.99, 'USD', 0),
    (10, 'taza-dota-aegis', 'Taza Dota 2 Aegis',
     'Taza de cerámica de 350 ml con el Aegis of Champions.',
     4, 2, 8, NULL, 19.99, 'USD', 0),
    (11, 'peluche-gaimin-gladiators', 'Peluche Gaimin Gladiators',
     'Peluche suave de edición limitada con el gladiador del equipo.',
     4, 3, 12, 9, 22.99, 'USD', 0),
    (12, 'poster-team-spirit', 'Póster Team Spirit',
     'Póster de gran formato impreso en papel mate de alta calidad.',
     4, 2, 10, 8, 14.99, 'USD', 0);

INSERT IGNORE INTO product_variants (id, product_id, sku, size, color, price_delta, stock) VALUES
    (1, 1, 'T1-JERSEY-2024-S',    'S',    'NEGRO',   0.00, 12),
    (2, 1, 'T1-JERSEY-2024-M',    'M',    'NEGRO',   0.00, 20),
    (3, 1, 'T1-JERSEY-2024-L',    'L',    'NEGRO',   0.00, 8),
    (4, 2, 'SEN-MOUSEPAD-XL',     'XL',   'NEGRO',   0.00, 30),
    (5, 3, 'TS-AEGIS-FIG-UNICA',  'UNICA','ROJO',    0.00, 5),
    (6, 4, 'FNATIC-CAP-UNICA',    'UNICA','NEGRO',   0.00, 25),
    (7, 5, 'G2-HOODIE-S',         'S',    'NEGRO',   0.00, 10),
    (8, 5, 'G2-HOODIE-M',         'M',    'NEGRO',   0.00, 14),
    (9, 6, 'TL-MOUSEPAD-XL',      'XL',   'NEGRO',   0.00, 22),
    (10, 7, 'SEN-BACKPACK-UNICA', 'UNICA','NEGRO',   0.00, 9),
    (11, 8, 'NAVI-FIG-UNICA',     'UNICA','AMARILLO',0.00, 6),
    (12, 9, 'FAZE-JERSEY-2024-M', 'M',    'NEGRO',   0.00, 11),
    (13, 10, 'DOTA-MUG-UNICA',    'UNICA','NEGRO',   0.00, 40),
    (14, 11, 'GG-PLUSH-UNICA',    'UNICA','AZUL',    0.00, 17),
    (15, 12, 'TS-POSTER-A2',      'UNICA','VERDE',   0.00, 30);

-- ---------------------------------------------------------------------
-- Usuarios de demostración (contraseñas hasheadas con BCrypt, costo 10)
--   admin@merchshop.dev   / Admin1234!    -> ADMIN
--   cliente@merchshop.dev / Cliente1234!  -> CUSTOMER
-- Cambiar ambas credenciales antes de cualquier despliegue real.
-- ---------------------------------------------------------------------
INSERT IGNORE INTO users (id, email, password_hash, display_name, role, provider, active) VALUES
    (1, 'admin@merchshop.dev',
     '$2a$10$e5SjaWv9vLvOYiWeDR57Wu6Ne4.M.2n/zxJEWTmuac1nAK2rU4Er6',
     'Admin Demo', 'ADMIN', 'LOCAL', 1),
    (2, 'cliente@merchshop.dev',
     '$2a$10$pinAzT.jCxvZMlrRD4gL1utSko8qGhNKSaMz6sXQ0PO0yLFFrpCoS',
     'Cliente Demo', 'CUSTOMER', 'LOCAL', 1);
