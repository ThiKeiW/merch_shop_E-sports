import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { OrderDetailPage, OrdersPage } from './index'
import type { Order } from './types'

const orders: Order[] = [
  {
    id: 7,
    code: 'abcdef1234567890abcdef1234567890',
    status: 'PENDING' as const,
    subtotal: 64.99,
    shippingCost: 0,
    total: 64.99,
    currency: 'EUR',
    stripePaymentIntentId: null,
    reservationExpiresAt: '2026-11-18T12:00:00Z',
    createdAt: '2026-11-18T11:45:00Z',
    itemCount: 1,
    items: [
      {
        productId: 1001,
        variantId: 5001,
        productName: 'Jersey Fnatic',
        variantLabel: 'M / Negro',
        unitPrice: 64.99,
        quantity: 1,
        lineTotal: 64.99,
        imagePath: null,
      },
    ],
  },
]

function renderOrders(entry = '/pedidos') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/pedidos" element={<OrdersPage />} />
          <Route path="/pedidos/:code" element={<OrderDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('pedidos', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('lista los pedidos del cliente', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => orders })))
    renderOrders()

    expect(await screen.findByRole('link', { name: /abcdef123456/ })).toBeInTheDocument()
    expect(screen.getByText('EUR $64.99')).toBeInTheDocument()
    expect(screen.getByText('Pendiente')).toBeInTheDocument()
  })

  it('confirma automáticamente el pago al abrir un pedido con intent', async () => {
    const pending = { ...orders[0], stripePaymentIntentId: 'pi_123' }
    const paid = { ...pending, status: 'PAID' as const }
    let current = pending
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.includes('/confirm') && init?.method === 'POST') {
        current = paid
        return {
          ok: true,
          status: 200,
          json: async () => ({
            orderCode: current.code,
            orderStatus: 'PAID',
            paymentStatus: 'succeeded',
          }),
        }
      }
      return { ok: true, status: 200, json: async () => current }
    })
    vi.stubGlobal('fetch', fetchMock)

    renderOrders('/pedidos/abcdef1234567890abcdef1234567890')

    expect(await screen.findByText('Pagado')).toBeInTheDocument()
    expect(
      fetchMock.mock.calls.some(
        ([input, init]) => String(input).includes('/confirm') && init?.method === 'POST',
      ),
    ).toBe(true)
  })

  it('cancela un pedido pendiente y actualiza el estado', async () => {
    const cancelled = { ...orders[0], status: 'EXPIRED' as const }
    let current = orders[0]
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        current = cancelled
      }
      return { ok: true, status: 200, json: async () => current }
    })
    vi.stubGlobal('fetch', fetchMock)
    const ui = userEvent.setup()
    renderOrders('/pedidos/abcdef1234567890abcdef1234567890')

    await ui.click(await screen.findByRole('button', { name: 'Cancelar pedido' }))

    expect(await screen.findByText('Expirado/Cancelado')).toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true)
  })
})
