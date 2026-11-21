import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

import { fetchFacets, fetchProducts } from './api'
import {
  activeFilterCount,
  parseFilters,
  toggleValue,
  toSearchParams,
} from './filters'
import { ProductCard } from './ProductCard'
import type { CatalogFilters, CatalogSort } from './types'

const SORT_OPTIONS: { value: CatalogSort; label: string }[] = [
  { value: 'relevance', label: 'Destacados' },
  { value: 'newest', label: 'Novedades' },
  { value: 'price-asc', label: 'Precio: menor a mayor' },
  { value: 'price-desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre A-Z' },
]

type FilterOption = { slug: string; name: string }

function FilterGroup({
  title,
  options,
  selected,
  onToggle,
}: {
  title: string
  options: FilterOption[]
  selected: string[]
  onToggle: (slug: string) => void
}) {
  return (
    <fieldset>
      <legend className="mb-3 text-[0.7rem] font-extrabold tracking-[0.25em] text-white/45 uppercase">
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 ? (
          <p className="text-xs text-white/45">Sin opciones para la selección actual.</p>
        ) : (
          options.map((option) => {
            const pressed = selected.includes(option.slug)
            return (
              <button
                key={option.slug}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggle(option.slug)}
                className="bevel bevel-xs"
              >
                {option.name}
              </button>
            )
          })
        )}
      </div>
    </fieldset>
  )
}

function SkeletonCard() {
  return (
    <div className="border border-white/10 bg-surface">
      <div className="aspect-[4/5] animate-pulse bg-surface-2" />
      <div className="space-y-3 p-4">
        <div className="h-2.5 w-24 animate-pulse bg-surface-2" />
        <div className="h-4 w-3/4 animate-pulse bg-surface-2" />
        <div className="h-6 w-24 animate-pulse bg-surface-2" />
      </div>
    </div>
  )
}

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const searchRef = useRef<HTMLInputElement>(null)

  const productsQuery = useQuery({
    queryKey: ['catalog', 'products', filters],
    queryFn: () => fetchProducts(filters),
  })

  const facetsQuery = useQuery({
    queryKey: ['catalog', 'facets', filters.games],
    queryFn: () => fetchFacets(filters.games),
  })

  const facets = facetsQuery.data

  const apply = (patch: Partial<CatalogFilters>) => {
    setSearchParams(toSearchParams(filters, { page: 1, ...patch }))
  }

  useEffect(() => {
    if (!facets) return
    const available = new Set(facets.teams.map((team) => team.slug))
    const kept = filters.teams.filter((slug) => available.has(slug))
    if (kept.length !== filters.teams.length) {
      setSearchParams(toSearchParams(filters, { teams: kept, page: 1 }), { replace: true })
    }
  }, [facets, filters, setSearchParams])

  const clearAll = () => setSearchParams(new URLSearchParams())

  const total = productsQuery.data?.total ?? 0
  const activeCount = activeFilterCount(filters)

  return (
    <section className="pb-20 pt-28">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <p className="eyebrow">Catálogo</p>
        <div className="mt-3 flex flex-col gap-10 md:flex-row md:items-end md:justify-between md:gap-6">
          <h1 className="display text-4xl leading-none md:text-6xl">
            Todo el merch
            <br />
            <span className="text-white/45">filtrado a tu manera</span>
          </h1>

          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault()
              apply({ q: searchRef.current?.value.trim() ?? '' })
            }}
            className="flex w-full gap-2 md:w-[420px]"
          >
            <label htmlFor="catalog-search" className="sr-only">
              Buscar productos
            </label>
            <div className="bevel-field">
              <input
                id="catalog-search"
                key={filters.q}
                ref={searchRef}
                type="search"
                defaultValue={filters.q}
                placeholder="Buscar jersey, figura, mousepad…"
              />
            </div>
            <button type="submit" className="bevel bevel-p shrink-0">
              <svg aria-hidden className="ic h-4 w-4" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <span className="hidden sm:inline">Buscar</span>
              <span className="sr-only sm:hidden">Buscar</span>
            </button>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 md:px-8">
        <div className="mt-8 border-t border-white/10 pt-8 lg:grid lg:grid-cols-[260px_1fr] lg:gap-10">
          <aside aria-label="Filtros del catálogo" className="mb-8 lg:mb-0">
            <div className="flex items-center justify-between pb-5">
              <h2 className="text-[0.72rem] font-extrabold tracking-[0.2em] uppercase">Filtros</h2>
              <button
                type="button"
                onClick={clearAll}
                disabled={activeCount === 0}
                className="text-xs font-bold text-white/55 underline underline-offset-4 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-white/25 disabled:no-underline"
              >
                Limpiar{activeCount > 0 ? ` (${activeCount})` : ''}
              </button>
            </div>

            <div className="flex flex-col gap-6 lg:sticky lg:top-24">
              <FilterGroup
                title="Juego"
                options={facets?.games ?? []}
                selected={filters.games}
                onToggle={(slug) => apply({ games: toggleValue(filters.games, slug) })}
              />
              <FilterGroup
                title="Equipo"
                options={facets?.teams ?? []}
                selected={filters.teams}
                onToggle={(slug) => apply({ teams: toggleValue(filters.teams, slug) })}
              />
              <FilterGroup
                title="Categoría"
                options={facets?.categories ?? []}
                selected={filters.categories}
                onToggle={(slug) => apply({ categories: toggleValue(filters.categories, slug) })}
              />
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-5">
              <p aria-live="polite" className="text-sm text-white/60">
                {productsQuery.isPending ? (
                  'Cargando productos…'
                ) : (
                  <>
                    <b className="text-white">{total}</b> {total === 1 ? 'producto' : 'productos'}
                  </>
                )}
              </p>

              <div className="flex items-center gap-2">
                <label
                  htmlFor="catalog-sort"
                  className="text-[0.65rem] font-bold tracking-[0.16em] text-white/45 uppercase"
                >
                  Ordenar
                </label>
                <select
                  id="catalog-sort"
                  value={filters.sort}
                  onChange={(event) => apply({ sort: event.target.value as CatalogSort })}
                  className="field field-sm w-auto"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {productsQuery.isError ? (
              <div className="box p-8 text-center">
                <p className="text-sm text-white/80">No pudimos cargar el catálogo.</p>
                <p className="mt-2 text-xs text-white/45">{productsQuery.error.message}</p>
                <button
                  type="button"
                  onClick={() => productsQuery.refetch()}
                  className="bevel mt-5"
                >
                  Reintentar
                </button>
              </div>
            ) : productsQuery.isPending ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))}
              </div>
            ) : productsQuery.data.items.length === 0 ? (
              <div className="box p-12 text-center">
                <p className="display text-2xl">Sin resultados</p>
                <p className="mt-3 text-sm text-white/50">
                  No hay productos con esta combinación. Prueba quitando algún filtro.
                </p>
                <button type="button" onClick={clearAll} className="bevel mt-6">
                  Limpiar filtros
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {productsQuery.data.items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {productsQuery.data.totalPages > 1 ? (
                  <nav
                    aria-label="Paginación del catálogo"
                    className="mt-10 flex items-center justify-between border-t border-white/10 pt-6"
                  >
                    <button
                      type="button"
                      onClick={() => apply({ page: Math.max(filters.page - 1, 1) })}
                      disabled={filters.page <= 1}
                      className="bevel bevel-sm"
                    >
                      Anterior
                    </button>
                    <span className="text-xs font-bold tracking-[0.16em] text-white/50 uppercase">
                      Página {productsQuery.data.page + 1} de {productsQuery.data.totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => apply({ page: filters.page + 1 })}
                      disabled={filters.page >= productsQuery.data.totalPages}
                      className="bevel bevel-sm"
                    >
                      Siguiente
                    </button>
                  </nav>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
