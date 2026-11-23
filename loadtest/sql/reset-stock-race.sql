-- Deja la variante usada por stock-race con una sola unidad.
-- Ejecutar justo antes de cada corrida de stock-race.

UPDATE product_variants SET stock = 1 WHERE id = 5204;
