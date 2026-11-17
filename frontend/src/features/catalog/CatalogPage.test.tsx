import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { CatalogPage } from './CatalogPage'
import type { CatalogFacets, CatalogPage as CatalogPageData } from './types'

const valorant = { id: 2, slug: 'valorant', name: 'Valorant', accentColor: '#FF4655' }
const sentinels = { id: 4, slug: 'sentinels', name: 'Sentinels', gameSlug: 'valorant' }
const teamLiquid = { id: 5, slug: 'team-liquid', name: 'Team Liquid', gameSlug: 'valorant' }

const facets: CatalogFacets = {
  games: [valorant],
  teams: [sentinels, teamLiquid],
  categories: [{ id: 2, slug: 'accesorios', name: 'Accesorios' }],
}

const productsPage: CatalogPageData = {
  items: [
    {
      id: 2,
      slug: 'mousepad-sentinels-vandal',
      name: 'Mousepad Sentinels Vandal',
      description: 'Mousepad extendido',
      price: 29.99,
      currency: 'USD',
      featured: true,
      game: valorant,
      category: { id: 2, slug: 'accesorios', name: 'Accesorios' },
      team: sentinels,
    },
  ],
  page: 0,
  size: 12,
  total: 1,
  totalPages: 1,
}

function mockCatalog(page: CatalogPageData = productsPage) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    const body = url.includes('/catalog/facets') ? facets : page
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderCatalog(entry = '/catalogo') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/catalogo" element={<CatalogPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function requestedUrls(fetchMock: ReturnType<typeof mockCatalog>): string[] {
  return fetchMock.mock.calls.map(([input]) => String(input))
}

describe('CatalogPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('envía el juego de la URL a productos y facets y pinta el placeholder', async () => {
    const fetchMock = mockCatalog()
    const { container } = renderCatalog('/catalogo?game=valorant')

    expect(await screen.findByText('Mousepad Sentinels Vandal')).toBeInTheDocument()
    expect(screen.getByText('USD $29.99')).toBeInTheDocument()
    expect(screen.getByText('Imagen en preparación')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByRole('link', { name: /Mousepad Sentinels Vandal/ })).toHaveAttribute(
      'href',
      '/producto/mousepad-sentinels-vandal',
    )

    const urls = requestedUrls(fetchMock)
    expect(urls.some((url) => url.includes('/catalog/products') && url.includes('game=valorant'))).toBe(true)
    expect(urls.some((url) => url.includes('/catalog/facets') && url.includes('game=valorant'))).toBe(true)
  })

  it('acumula el filtro de equipo sobre el juego ya seleccionado', async () => {
    const fetchMock = mockCatalog()
    const ui = userEvent.setup()
    renderCatalog('/catalogo?game=valorant')

    await screen.findByText('Mousepad Sentinels Vandal')
    await ui.click(screen.getByRole('button', { name: 'Sentinels' }))

    await waitFor(() => {
      const urls = requestedUrls(fetchMock)
      expect(
        urls.some(
          (url) =>
            url.includes('/catalog/products') &&
            url.includes('game=valorant') &&
            url.includes('team=sentinels'),
        ),
      ).toBe(true)
    })
    expect(screen.getByRole('button', { name: 'Sentinels' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('muestra el estado vacío cuando no hay coincidencias', async () => {
    mockCatalog({ items: [], page: 0, size: 12, total: 0, totalPages: 0 })
    renderCatalog('/catalogo?q=inexistente')

    expect(await screen.findByText('Sin resultados')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Limpiar filtros' })).toBeInTheDocument()
  })
})
