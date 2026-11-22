import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminProductsPage } from './AdminProductsPage'
import type { AdminFacets, AdminProductPage } from './types'

const facets: AdminFacets = {
  games: [{ id: 3, slug: 'cs2', name: 'Counter-Strike 2' }],
  categories: [
    {
      id: 1,
      slug: 'vestimenta',
      name: 'Vestimenta',
      subcategories: [{ id: 1, slug: 'jerseys', name: 'Jerseys' }],
    },
  ],
  teams: [{ id: 1, slug: 'fnatic', name: 'Fnatic', gameSlug: 'cs2' }],
}

const productsPage: AdminProductPage = {
  items: [
    {
      id: 7,
      slug: 'camiseta-fnatic',
      name: 'Camiseta Fnatic',
      price: 44.65,
      currency: 'EUR',
      active: true,
      featured: true,
      game: 'cs2',
      category: 'vestimenta',
      subcategory: 'jerseys',
      team: 'fnatic',
      imageUrl: null,
      stock: 14,
      variantCount: 3,
    },
    {
      id: 8,
      slug: 'gorra-fnatic',
      name: 'Gorra Fnatic',
      price: 24.99,
      currency: 'EUR',
      active: false,
      featured: false,
      game: 'cs2',
      category: 'vestimenta',
      subcategory: null,
      team: 'fnatic',
      imageUrl: '/images/products/gorra.webp',
      stock: 0,
      variantCount: 1,
    },
  ],
  page: 0,
  size: 10,
  total: 2,
  totalPages: 1,
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => body,
  } as Response
}

function mockAdmin(page: AdminProductPage = productsPage) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'DELETE') {
      return { ok: true, status: 204, json: async () => undefined } as Response
    }
    if (url.includes('/admin/facets')) {
      return jsonResponse(facets)
    }
    return jsonResponse(page)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/admin/productos']}>
        <AdminProductsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('lista productos con stock y estado, y carga los facets', async () => {
    const fetchMock = mockAdmin()
    renderPage()

    expect(await screen.findByText('Camiseta Fnatic')).toBeInTheDocument()
    expect(screen.getByText('camiseta-fnatic')).toBeInTheDocument()
    expect(screen.getByText('EUR $44.65')).toBeInTheDocument()
    expect(screen.getByText('(3 var.)')).toBeInTheDocument()
    expect(screen.getByText('Gorra Fnatic')).toBeInTheDocument()

    const urls = fetchMock.mock.calls.map(([input]) => String(input))
    expect(urls.some((url) => url.includes('/admin/products?') && url.includes('page=0'))).toBe(true)
    expect(urls.some((url) => url.includes('/admin/facets'))).toBe(true)
  })

  it('envía el filtro de juego al backend', async () => {
    const fetchMock = mockAdmin()
    const ui = userEvent.setup()
    renderPage()

    await screen.findByText('Camiseta Fnatic')
    await ui.selectOptions(screen.getByLabelText('Juego'), 'cs2')

    await waitFor(() => {
      const urls = fetchMock.mock.calls.map(([input]) => String(input))
      expect(urls.some((url) => url.includes('/admin/products') && url.includes('game=cs2'))).toBe(true)
    })
  })

  it('desactiva un producto activo tras confirmar', async () => {
    const fetchMock = mockAdmin()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const ui = userEvent.setup()
    renderPage()

    await screen.findByText('Camiseta Fnatic')
    await ui.click(screen.getByRole('button', { name: 'Desactivar' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')
      expect(call).toBeDefined()
      expect(String(call?.[0])).toBe('/api/admin/products/7')
    })
    expect(screen.queryAllByRole('button', { name: 'Desactivar' })).toHaveLength(1)
  })
})
