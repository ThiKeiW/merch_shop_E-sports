import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { CartPage } from './CartPage'
import { useCartStore } from './store'
import type { CartItem } from './types'

const item: CartItem = {
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
  stock: 3,
  quantity: 2,
}

function renderCart() {
  return render(
    <MemoryRouter initialEntries={['/carrito']}>
      <CartPage />
    </MemoryRouter>,
  )
}

describe('CartPage', () => {
  beforeEach(() => {
    useCartStore.setState({ items: [item] })
  })

  it('muestra la línea, el subtotal y permite cambiar la cantidad', async () => {
    const ui = userEvent.setup()
    renderCart()

    expect(screen.getByText('Jersey Fnatic')).toBeInTheDocument()
    expect(screen.getByText('M / Negro · FNC-M')).toBeInTheDocument()
    expect(screen.getByText('EUR $129.98')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ingresar para continuar' })).toBeInTheDocument()

    await ui.click(screen.getByRole('button', { name: 'Quitar una unidad de Jersey Fnatic' }))
    expect(screen.getByText('EUR $64.99')).toBeInTheDocument()
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('elimina una línea del carrito', async () => {
    const ui = userEvent.setup()
    renderCart()

    await ui.click(screen.getByRole('button', { name: 'Eliminar' }))

    expect(screen.getByText('Todavía no añadiste productos.')).toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })
})
