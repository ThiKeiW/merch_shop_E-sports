import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdminProductFormPage } from './AdminProductFormPage'
import type { AdminFacets, AdminProductDetail } from './types'

const facets: AdminFacets = {
  games: [
    { id: 3, slug: 'cs2', name: 'Counter-Strike 2' },
    { id: 2, slug: 'valorant', name: 'Valorant' },
  ],
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

const product: AdminProductDetail = {
  id: 9,
  slug: 'camiseta-fnatic',
  name: 'Camiseta Fnatic',
  description: 'Camiseta oficial',
  price: 44.65,
  currency: 'EUR',
  active: true,
  featured: true,
  game: 'cs2',
  category: 'vestimenta',
  subcategory: 'jerseys',
  team: 'fnatic',
  variants: [
    { id: 1, sku: 'FNC-M', size: 'M', color: 'Negro', priceDelta: 0, stock: 5 },
  ],
  images: [
    {
      id: 1,
      path: '/images/products/fnatic.webp',
      sourceUrl: 'https://example.com/fnatic.webp',
      kind: 'CARD',
      primary: true,
    },
  ],
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: async () => body,
  } as Response
}

function mockApi(detail: AdminProductDetail = product) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (url.includes('/admin/facets')) {
      return jsonResponse(facets)
    }
    if (url.includes('/admin/products/') && (!init?.method || init.method === 'GET')) {
      return jsonResponse(detail)
    }
    if (init?.method === 'POST' || init?.method === 'PUT') {
      return jsonResponse(detail, init.method === 'POST' ? 201 : 200)
    }
    return jsonResponse(detail)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderForm(entry: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/admin/productos/nuevo" element={<AdminProductFormPage />} />
          <Route path="/admin/productos/:id" element={<AdminProductFormPage />} />
          <Route path="/admin/productos" element={<p>Listado</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('AdminProductFormPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('crea un producto y envía variantes, imagen y datos generales', async () => {
    const fetchMock = mockApi()
    const ui = userEvent.setup()
    renderForm('/admin/productos/nuevo')

    await ui.type(await screen.findByLabelText('Nombre'), 'Camiseta Nueva')
    await ui.type(screen.getByLabelText('Precio base'), '39.99')
    await ui.type(screen.getByLabelText('Talla variante 1'), 'M')
    await ui.type(screen.getByLabelText('Color variante 1'), 'Negro')
    await ui.type(screen.getByLabelText('Stock variante 1'), '8')
    await ui.click(screen.getByRole('button', { name: 'Agregar imagen' }))
    await ui.type(screen.getByLabelText('Ruta imagen 1'), '/images/products/nueva.webp')
    await ui.click(screen.getByRole('button', { name: 'Crear producto' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
      expect(call).toBeDefined()
      const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>
      expect(body.name).toBe('Camiseta Nueva')
      expect(body.price).toBe(39.99)
      expect(body.game).toBe('cs2')
      expect(body.category).toBe('vestimenta')
      expect(body.subcategory).toBeNull()
      expect(body.team).toBeNull()
      expect(body.active).toBe(true)
      expect(body.variants).toEqual([
        { sku: null, size: 'M', color: 'Negro', priceDelta: 0, stock: 8 },
      ])
      expect(body.images).toEqual([
        { path: '/images/products/nueva.webp', sourceUrl: null, kind: 'CARD', primary: true },
      ])
    })
  })

  it('carga el producto existente y guarda los cambios con PUT', async () => {
    const fetchMock = mockApi()
    const ui = userEvent.setup()
    renderForm('/admin/productos/9')

    const nameInput = await screen.findByLabelText('Nombre')
    expect(nameInput).toHaveValue('Camiseta Fnatic')
    expect(screen.getByLabelText('Precio base')).toHaveValue(44.65)
    expect(screen.getByLabelText('Talla variante 1')).toHaveValue('M')
    expect(screen.getByLabelText('Ruta imagen 1')).toHaveValue('/images/products/fnatic.webp')

    await ui.clear(nameInput)
    await ui.type(nameInput, 'Camiseta Fnatic 2025')
    await ui.click(screen.getByRole('button', { name: 'Guardar cambios' }))

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')
      expect(call).toBeDefined()
      expect(String(call?.[0])).toBe('/api/admin/products/9')
      const body = JSON.parse(String(call?.[1]?.body)) as Record<string, unknown>
      expect(body.name).toBe('Camiseta Fnatic 2025')
      expect(body.slug).toBe('camiseta-fnatic')
    })
  })

  it('valida localmente que el precio no sea negativo', async () => {
    mockApi()
    const ui = userEvent.setup()
    renderForm('/admin/productos/nuevo')

    await ui.type(await screen.findByLabelText('Nombre'), 'Producto')
    await ui.clear(screen.getByLabelText('Precio base'))
    await ui.type(screen.getByLabelText('Precio base'), '-5')
    // El input number con min no impide escribir; el submit debe bloquearse.
    await ui.click(screen.getByRole('button', { name: 'Crear producto' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa el nombre y el precio')
  })
})
