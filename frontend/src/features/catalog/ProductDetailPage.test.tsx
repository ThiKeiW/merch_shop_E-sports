import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useCartStore } from '@/features/cart'

import { ProductDetailPage } from './ProductDetailPage'
import type { ProductDetail } from './types'

const product: ProductDetail = {
  id: 1,
  slug: 'jersey-t1-2024',
  name: 'Jersey T1 2024',
  description: 'Camiseta oficial de T1 para la temporada 2024.',
  price: 69.99,
  currency: 'USD',
  featured: true,
  game: { id: 1, slug: 'league-of-legends', name: 'League of Legends', accentColor: '#0AC8B9' },
  category: { id: 1, slug: 'vestimenta', name: 'Vestimenta' },
  team: { id: 1, slug: 't1', name: 'T1', gameSlug: 'league-of-legends' },
  variants: [
    {
      id: 1,
      sku: 'T1-JERSEY-2024-S',
      size: 'S',
      color: 'NEGRO',
      priceDelta: 0,
      finalPrice: 69.99,
      stock: 12,
      available: true,
    },
    {
      id: 3,
      sku: 'T1-JERSEY-2024-L',
      size: 'L',
      color: 'NEGRO',
      priceDelta: 5,
      finalPrice: 74.99,
      stock: 3,
      available: true,
    },
    {
      id: 4,
      sku: 'T1-JERSEY-2024-XXL',
      size: 'XXL',
      color: 'NEGRO',
      priceDelta: 8,
      finalPrice: 77.99,
      stock: 0,
      available: false,
    },
  ],
  images: [],
}

function mockProduct(result: { ok: boolean; status: number; body: unknown }) {
  const fetchMock = vi.fn(async () => ({
    ok: result.ok,
    status: result.status,
    json: async () => result.body,
  }))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderDetail(slug = 'jersey-t1-2024') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/producto/${slug}`]}>
        <Routes>
          <Route path="/producto/:slug" element={<ProductDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('ProductDetailPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    useCartStore.setState({ items: [] })
  })

  it('muestra el producto, su stock y permite cambiar de variante', async () => {
    const fetchMock = mockProduct({ ok: true, status: 200, body: product })
    const ui = userEvent.setup()
    renderDetail()

    expect(await screen.findByRole('heading', { name: 'Jersey T1 2024' })).toBeInTheDocument()
    expect(screen.getByText('USD $69.99')).toBeInTheDocument()
    expect(screen.getByText('Imagen en preparación')).toBeInTheDocument()
    expect(screen.getByText('T1-JERSEY-2024-S')).toBeInTheDocument()
    expect(screen.getByText(/En stock/)).toBeInTheDocument()

    await ui.click(screen.getByRole('button', { name: 'L NEGRO' }))

    expect(screen.getByText('USD $74.99')).toBeInTheDocument()
    expect(screen.getByText(/En stock/)).toBeInTheDocument()
    expect(screen.getByText('T1-JERSEY-2024-L')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /XXL NEGRO/ })).toBeDisabled()
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/catalog/products/jersey-t1-2024'),
      expect.anything(),
    )
  })

  it('añade la variante seleccionada al carrito persistente', async () => {
    mockProduct({ ok: true, status: 200, body: product })
    const ui = userEvent.setup()
    renderDetail()

    await ui.click(await screen.findByRole('button', { name: 'L NEGRO' }))
    await ui.click(screen.getByRole('button', { name: 'Añadir al carrito' }))

    expect(screen.getByRole('status')).toHaveTextContent('Añadido')
    expect(useCartStore.getState().items).toEqual([
      expect.objectContaining({
        variantId: 3,
        sku: 'T1-JERSEY-2024-L',
        unitPrice: 74.99,
        quantity: 1,
      }),
    ])
  })

  it('muestra un estado 404 cuando el producto no existe', async () => {
    mockProduct({ ok: false, status: 404, body: { message: 'Producto no encontrado' } })
    renderDetail('no-existe')

    expect(await screen.findByText('Producto no encontrado')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Volver al catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    )
  })
})
