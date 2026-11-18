import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { ApiError } from '@/shared/api'

import { AdminNav } from './AdminNav'
import {
  deactivateAdminProduct,
  fetchAdminFacets,
  fetchAdminProducts,
} from './api'
import { ADMIN_PAGE_SIZE, type AdminProductFilters, type AdminProductSummary } from './types'

function formatPrice(price: number, currency: string): string {
  return `${currency} $${price.toFixed(2)}`
}

function ProductRow({
  product,
  onDeactivate,
  deactivating,
}: {
  product: AdminProductSummary
  onDeactivate: (product: AdminProductSummary) => void
  deactivating: boolean
}) {
  return (
    <tr className="border-b border-line/60 last:border-0">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden border border-line bg-surface-2">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm text-zinc-100">{product.name}</p>
            <p className="truncate text-[11px] text-zinc-500">{product.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-zinc-400">
        <p className="uppercase tracking-[0.12em]">{product.game}</p>
        <p className="text-zinc-500">
          {product.category}
          {product.subcategory ? ` / ${product.subcategory}` : ''}
        </p>
      </td>
      <td className="px-4 py-3 text-sm text-zinc-200">{formatPrice(product.price, product.currency)}</td>
      <td className="px-4 py-3 text-sm text-zinc-400">
        {product.stock}
        <span className="ml-1 text-[11px] text-zinc-600">({product.variantCount} var.)</span>
      </td>
      <td className="px-4 py-3">
        <span
          className={[
            'border px-2 py-0.5 text-[10px] font-bold tracking-[0.14em] uppercase',
            product.active
              ? 'border-emerald-500/40 text-emerald-300'
              : 'border-line text-zinc-500',
          ].join(' ')}
        >
          {product.active ? 'Activo' : 'Inactivo'}
        </span>
        {product.featured ? (
          <span className="ml-2 text-[10px] tracking-[0.14em] text-zinc-500 uppercase">Destacado</span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
          <Link to={`/admin/productos/${product.id}`} className="text-zinc-300 hover:text-white">
            Editar
          </Link>
          {product.active ? (
            <button
              type="button"
              disabled={deactivating}
              onClick={() => onDeactivate(product)}
              className="text-red-300 hover:text-red-200 disabled:opacity-50"
            >
              Desactivar
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  )
}

export function AdminProductsPage() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<AdminProductFilters>({
    q: '',
    active: 'all',
    game: '',
    category: '',
    page: 0,
  })
  const [search, setSearch] = useState('')

  const facetsQuery = useQuery({ queryKey: ['admin', 'facets'], queryFn: fetchAdminFacets })
  const productsQuery = useQuery({
    queryKey: ['admin', 'products', filters],
    queryFn: () => fetchAdminProducts(filters),
  })

  const deactivateMutation = useMutation({
    mutationFn: deactivateAdminProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin', 'products'] }),
  })

  const total = productsQuery.data?.total ?? 0
  const totalPages = productsQuery.data?.totalPages ?? 0
  const page = productsQuery.data?.page ?? filters.page
  const items = productsQuery.data?.items ?? []

  const updateFilter = <K extends keyof AdminProductFilters>(key: K, value: AdminProductFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === 'page' ? (value as number) : 0 }))
  }

  const handleDeactivate = (product: AdminProductSummary) => {
    if (!window.confirm(`¿Desactivar "${product.name}"? Dejará de aparecer en el catálogo.`)) {
      return
    }
    deactivateMutation.mutate(product.id)
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Staff</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Administración</h1>
      <p className="mt-3 text-sm text-zinc-400">
        Gestiona usuarios y el catálogo editable de la tienda.
      </p>

      <div className="mt-8">
        <AdminNav />

        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              updateFilter('q', search)
            }}
          >
            <div className="space-y-2">
              <label
                htmlFor="admin-search"
                className="block text-[11px] font-semibold tracking-[0.2em] text-zinc-400 uppercase"
              >
                Buscar
              </label>
              <input
                id="admin-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o slug"
                className="w-56 border border-line bg-surface-2 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-400"
              />
            </div>

            <select
              aria-label="Juego"
              value={filters.game}
              onChange={(event) => updateFilter('game', event.target.value)}
              className="border border-line bg-surface-2 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Todos los juegos</option>
              {(facetsQuery.data?.games ?? []).map((game) => (
                <option key={game.slug} value={game.slug}>
                  {game.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Categoría"
              value={filters.category}
              onChange={(event) => updateFilter('category', event.target.value)}
              className="border border-line bg-surface-2 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="">Todas las categorías</option>
              {(facetsQuery.data?.categories ?? []).map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Estado"
              value={filters.active}
              onChange={(event) =>
                updateFilter('active', event.target.value as AdminProductFilters['active'])
              }
              className="border border-line bg-surface-2 px-3 py-2 text-sm text-zinc-200"
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>

            <button
              type="submit"
              className="border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
            >
              Aplicar
            </button>
          </form>

          <Link
            to="/admin/productos/nuevo"
            className="bg-white px-4 py-2.5 text-center text-[11px] font-bold tracking-[0.18em] text-ink uppercase transition-opacity hover:opacity-85"
          >
            Nuevo producto
          </Link>
        </div>

        {deactivateMutation.isError ? (
          <p role="alert" className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            {deactivateMutation.error instanceof ApiError
              ? deactivateMutation.error.message
              : 'No pudimos desactivar el producto.'}
          </p>
        ) : null}

        <div className="mt-6 border border-line bg-surface">
          <div className="flex items-center justify-between border-b border-line px-4 py-3 text-[11px] font-semibold tracking-[0.2em] text-zinc-500 uppercase">
            <span>Productos</span>
            <span>{total}</span>
          </div>

          {productsQuery.isPending ? (
            <p className="px-4 py-8 text-sm text-zinc-500">Cargando productos…</p>
          ) : productsQuery.isError ? (
            <p role="alert" className="px-4 py-8 text-sm text-red-300">
              No pudimos cargar el catálogo.
            </p>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-zinc-500">No hay productos con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
                  <tr className="border-b border-line">
                    <th className="px-4 py-2.5 font-semibold">Producto</th>
                    <th className="px-4 py-2.5 font-semibold">Clasificación</th>
                    <th className="px-4 py-2.5 font-semibold">Precio</th>
                    <th className="px-4 py-2.5 font-semibold">Stock</th>
                    <th className="px-4 py-2.5 font-semibold">Estado</th>
                    <th className="px-4 py-2.5 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((product) => (
                    <ProductRow
                      key={product.id}
                      product={product}
                      deactivating={deactivateMutation.isPending}
                      onDeactivate={handleDeactivate}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-line px-4 py-3 text-[11px] text-zinc-500">
            <span>
              Página {page + 1} de {Math.max(totalPages, 1)} · {ADMIN_PAGE_SIZE} por página
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => updateFilter('page', page - 1)}
                className="border border-line px-3 py-1.5 tracking-[0.14em] uppercase transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => updateFilter('page', page + 1)}
                className="border border-line px-3 py-1.5 tracking-[0.14em] uppercase transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
