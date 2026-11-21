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
    <tr className="border-b border-white/10 last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 overflow-hidden bg-surface-2">
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
            <p className="truncate text-sm font-bold text-white">{product.name}</p>
            <p className="truncate text-[0.65rem] text-white/40">{product.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4 text-xs text-white/55">
        <p className="font-bold tracking-[0.12em] uppercase">{product.game}</p>
        <p className="text-white/35">
          {product.category}
          {product.subcategory ? ` / ${product.subcategory}` : ''}
        </p>
      </td>
      <td className="px-5 py-4 text-sm text-white/80">{formatPrice(product.price, product.currency)}</td>
      <td className="px-5 py-4 text-sm text-white/55">
        {product.stock}
        <span className="ml-1 text-[0.65rem] text-white/30">({product.variantCount} var.)</span>
      </td>
      <td className="px-5 py-4">
        <span className="bevel bevel-xs pointer-events-none">{product.active ? 'Activo' : 'Inactivo'}</span>
        {product.featured ? (
          <span className="ml-2 text-[0.58rem] font-bold tracking-[0.14em] text-white/40 uppercase">
            Destacado
          </span>
        ) : null}
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center justify-end gap-4 text-[0.65rem] font-extrabold tracking-[0.14em] uppercase">
          <Link to={`/admin/productos/${product.id}`} className="text-white/65 hover:text-white">
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
    <section className="mx-auto w-full max-w-[1400px] px-4 pb-20 pt-28 md:px-8">
      <p className="eyebrow">Staff</p>
      <h1 className="display mt-2 text-4xl md:text-6xl">Administración</h1>
      <p className="mt-3 text-sm text-white/50">
        Gestiona usuarios y el catálogo editable de la tienda.
      </p>

      <div className="mt-8">
        <AdminNav />

        <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              updateFilter('q', search)
            }}
          >
            <div>
              <label
                htmlFor="admin-search"
                className="block text-[0.65rem] font-extrabold tracking-[0.2em] text-white/45 uppercase"
              >
                Buscar
              </label>
              <input
                id="admin-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Nombre o slug"
                className="field field-sm mt-2 w-56"
              />
            </div>

            <select
              aria-label="Juego"
              value={filters.game}
              onChange={(event) => updateFilter('game', event.target.value)}
              className="field field-sm w-auto"
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
              className="field field-sm w-auto"
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
              className="field field-sm w-auto"
            >
              <option value="all">Todos</option>
              <option value="true">Activos</option>
              <option value="false">Inactivos</option>
            </select>

            <button type="submit" className="bevel bevel-sm">
              Aplicar
            </button>
          </form>

          <Link to="/admin/productos/nuevo" className="bevel bevel-p">
            Nuevo producto
          </Link>
        </div>

        {deactivateMutation.isError ? (
          <p
            role="alert"
            className="mt-4 border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-300"
          >
            {deactivateMutation.error instanceof ApiError
              ? deactivateMutation.error.message
              : 'No pudimos desactivar el producto.'}
          </p>
        ) : null}

        <div className="box mt-6">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 text-[0.65rem] font-extrabold tracking-[0.2em] text-white/45 uppercase">
            <span>Productos</span>
            <span>{total}</span>
          </div>

          {productsQuery.isPending ? (
            <p className="px-5 py-10 text-sm text-white/45">Cargando productos…</p>
          ) : productsQuery.isError ? (
            <p role="alert" className="px-5 py-10 text-sm text-red-300">
              No pudimos cargar el catálogo.
            </p>
          ) : items.length === 0 ? (
            <p className="px-5 py-10 text-sm text-white/45">No hay productos con estos filtros.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead className="text-[0.65rem] font-extrabold tracking-[0.18em] text-white/40 uppercase">
                  <tr className="border-b border-white/10">
                    <th className="px-5 py-3 font-extrabold">Producto</th>
                    <th className="px-5 py-3 font-extrabold">Clasificación</th>
                    <th className="px-5 py-3 font-extrabold">Precio</th>
                    <th className="px-5 py-3 font-extrabold">Stock</th>
                    <th className="px-5 py-3 font-extrabold">Estado</th>
                    <th className="px-5 py-3 text-right font-extrabold">Acciones</th>
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-5 py-3 text-[0.65rem] text-white/40">
            <span>
              Página {page + 1} de {Math.max(totalPages, 1)} · {ADMIN_PAGE_SIZE} por página
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => updateFilter('page', page - 1)}
                className="bevel bevel-xs"
              >
                Anterior
              </button>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => updateFilter('page', page + 1)}
                className="bevel bevel-xs"
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
