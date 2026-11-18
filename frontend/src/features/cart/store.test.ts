import { beforeEach, describe, expect, it } from 'vitest'

import { useCartStore } from './store'
import type { CartItemInput } from './types'

const item: CartItemInput = {
  variantId: 5001,
  productId: 1001,
  slug: 'jersey-fnatic',
  name: 'Jersey Fnatic',
  sku: 'FNC-M',
  size: 'M',
  color: 'Negro',
  unitPrice: 64.99,
  currency: 'EUR',
  imagePath: null,
  stock: 5,
}

describe('cart store', () => {
  beforeEach(() => {
    localStorage.clear()
    useCartStore.setState({ items: [] })
  })

  it('acumula cantidades sin superar el stock y persiste en localStorage', () => {
    useCartStore.getState().add(item, 3)
    useCartStore.getState().add(item, 4)

    expect(useCartStore.getState().items).toEqual([{ ...item, quantity: 5 }])
    expect(localStorage.getItem('merch:cart')).toContain('"variantId":5001')
  })

  it('ignora variantes agotadas', () => {
    useCartStore.getState().add({ ...item, stock: 0 })

    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('actualiza, elimina y vacía el carrito', () => {
    useCartStore.getState().add(item)
    useCartStore.getState().updateQuantity(5001, 0)

    expect(useCartStore.getState().items).toHaveLength(0)

    useCartStore.getState().add(item)
    useCartStore.getState().updateQuantity(5001, 9)

    expect(useCartStore.getState().items[0].quantity).toBe(5)

    useCartStore.getState().remove(5001)
    expect(useCartStore.getState().items).toHaveLength(0)

    useCartStore.getState().add(item)
    useCartStore.getState().clear()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
