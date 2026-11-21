import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { tokenStorage } from '@/shared/auth/tokenStorage'

const mocks = vi.hoisted(() => ({
  confirmPayment: vi.fn(),
  loadStripe: vi.fn(),
}))

vi.mock('@stripe/stripe-js', () => ({ loadStripe: mocks.loadStripe }))

vi.mock('@stripe/react-stripe-js', async () => {
  const React = await import('react')
  return {
    Elements: ({ children }: { children: ReactNode }) =>
      React.createElement('div', { 'data-testid': 'elements' }, children),
    PaymentElement: () => React.createElement('div', { 'data-testid': 'payment-element' }),
    useElements: () => ({}),
    useStripe: () => ({ confirmPayment: mocks.confirmPayment }),
  }
})

import { PaymentPage } from './PaymentPage'

const order = {
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
}

const intent = {
  orderCode: 'CODE123',
  paymentIntentId: 'pi_CODE123',
  clientSecret: 'pi_CODE123_secret',
  publishableKey: 'pk_test_dummy',
}

function renderPaymentPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/pagar/CODE123']}>
        <Routes>
          <Route path="/pagar/:code" element={<PaymentPage />} />
          <Route path="/pedidos/:code" element={<p>Detalle del pedido</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function stubApi(publishableKey = intent.publishableKey) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.startsWith('/api/orders/')) {
      return { ok: true, status: 200, json: async () => order }
    }
    if (url === '/api/payments/intent') {
      return { ok: true, status: 200, json: async () => ({ ...intent, publishableKey }) }
    }
    if (url === '/api/payments/CODE123/confirm') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ orderCode: 'CODE123', orderStatus: 'PAID', paymentStatus: 'succeeded' }),
      }
    }
    throw new Error(`Unexpected URL: ${url}`)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('PaymentPage', () => {
  beforeEach(() => {
    tokenStorage.set('token')
    mocks.loadStripe.mockResolvedValue({})
    mocks.confirmPayment.mockResolvedValue({ error: null, paymentIntent: { status: 'succeeded' } })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    tokenStorage.clear()
  })

  it('muestra el Payment Element y confirma el pago', async () => {
    const fetchMock = stubApi()
    const ui = userEvent.setup()
    renderPaymentPage()

    expect(await screen.findByTestId('payment-element')).toBeInTheDocument()
    expect(screen.getByText('EUR $129.98')).toBeInTheDocument()
    expect(mocks.loadStripe).toHaveBeenCalledWith('pk_test_dummy')
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/payments/intent')).toBe(true)

    await ui.click(screen.getByRole('button', { name: 'Pagar pedido CODE123' }))

    await waitFor(() => expect(mocks.confirmPayment).toHaveBeenCalledTimes(1))
    expect(mocks.confirmPayment).toHaveBeenCalledWith(
      expect.objectContaining({ redirect: 'if_required' }),
    )
    expect(fetchMock.mock.calls.some(([url]) => String(url) === '/api/payments/CODE123/confirm')).toBe(true)
    expect(await screen.findByText('Detalle del pedido')).toBeInTheDocument()
  })

  it('avisa cuando Stripe no está configurado', async () => {
    stubApi('')
    renderPaymentPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Stripe no está configurado')
  })
})
