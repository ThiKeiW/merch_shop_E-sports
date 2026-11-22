package com.merchshop.importer.stock;

/**
 * Las tiendas solo publican disponibilidad; el stock es sintetico y estable a
 * partir del SKU (misma variante -> mismo stock en cada ejecucion).
 */
public final class StockSynthesizer {

    private static final int MIN_STOCK = 8;
    private static final int RANGE = 18;

    private StockSynthesizer() {
    }

    public static int stockFor(String sku, boolean available) {
        if (sku == null || sku.isBlank() || !available) {
            return 0;
        }
        long hash = Math.abs((long) sku.hashCode());
        return (int) (MIN_STOCK + (hash % RANGE));
    }
}
