import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuthStore } from '@/features/auth'

import { CheckoutPage } from './CheckoutPage'
import { useCartStore } from '@/features/cart'
import type { CartItem } from '@/features/cart'

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
  stock: 5,
  quantity: 2,
}

const user = {
  id: 2,
  email: 'cliente@merchshop.dev',
  displayName: 'Cliente Demo',
  role: 'CUSTOMER' as const,
  active: true,
  createdAt: '2026-01-01T00:00:00Z',
}

function renderCheckout() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pedidos/:code" element={<p>Pedido creado</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('CheckoutPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ token: 'token', user })
    useCartStore.setState({ items: [item] })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    useCartStore.setState({ items: [] })
    useAuthStore.setState({ token: null, user: null })
  })

  it('crea el pedido con las líneas del carrito, lo vacía y navega al detalle', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => ({
      ok: true,
      status: 201,
      json: async () => ({
        id: 1,
        code: 'CODE123',
        status: 'PENDING',
        subtotal: 129.98,
        shippingCost: 0,
        total: 129.98,
        currency: 'EUR',
        reservationExpiresAt: '2026-11-18T12:00:00Z',
        createdAt: '2026-11-18T11:45:00Z',
        itemCount: 1,
        items: [],
      }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const ui = userEvent.setup()
    renderCheckout()

    expect(await screen.findByText('cliente@merchshop.dev')).toBeInTheDocument()
    expect(screen.getAllByText('EUR $129.98')).toHaveLength(2)
    await ui.click(screen.getByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByText('Pedido creado')).toBeInTheDocument()
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('/api/orders')
    expect(JSON.parse(String(init?.body))).toEqual({
      items: [{ variantId: 5001, quantity: 2 }],
    })
    await waitFor(() => expect(useCartStore.getState().items).toHaveLength(0))
  })

  it('muestra el error del servidor cuando no hay stock', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Stock insuficiente para Jersey Fnatic' }),
      })),
    )
    const ui = userEvent.setup()
    renderCheckout()

    await ui.click(await screen.findByRole('button', { name: 'Confirmar pedido' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Stock insuficiente')
    expect(useCartStore.getState().items).toHaveLength(1)
  })
})
