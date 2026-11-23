-- Prepara la base para las pruebas de carga.
-- Deja stock alto en todo el catalogo para que los escenarios de compra no se
-- agoten, salvo la variante 5204 que se usa en stock-race con una sola unidad.
--
-- Uso:
--   docker compose -f compose.yaml -f loadtest/compose.loadtest.yaml \
--     exec -T mysql mysql -umerch -pmerchpass merch_shop < loadtest/sql/seed-loadtest.sql

UPDATE product_variants SET stock = 100000;
UPDATE product_variants SET stock = 1 WHERE id = 5204;
