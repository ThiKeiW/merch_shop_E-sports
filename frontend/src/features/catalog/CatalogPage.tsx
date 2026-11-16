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
    <fieldset className="border-b border-line pb-5">
      <legend className="mb-3 text-[11px] font-semibold tracking-[0.22em] text-zinc-400 uppercase">
        {title}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.length === 0 ? (
          <p className="text-xs text-zinc-500">Sin opciones para la selección actual.</p>
        ) : (
          options.map((option) => {
            const pressed = selected.includes(option.slug)
            return (
              <button
                key={option.slug}
                type="button"
                aria-pressed={pressed}
                onClick={() => onToggle(option.slug)}
                className={
                  pressed
                    ? 'border border-white bg-white px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-ink uppercase'
                    : 'border border-line px-3 py-1.5 text-[11px] font-semibold tracking-[0.1em] text-zinc-400 uppercase transition-colors hover:border-zinc-500 hover:text-white'
                }
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
    <div className="flex flex-col overflow-hidden border border-line bg-surface">
      <div className="aspect-[4/5] animate-pulse bg-surface-2" />
      <div className="flex flex-col gap-3 border-t border-line p-4">
        <div className="h-3 w-24 animate-pulse bg-surface-2" />
        <div className="h-4 w-3/4 animate-pulse bg-surface-2" />
        <div className="h-5 w-20 animate-pulse bg-surface-2" />
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
    <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-4 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">
            Catálogo
          </p>
          <h1 className="font-display mt-3 text-3xl leading-[0.95] tracking-tight uppercase sm:text-5xl">
            Todo el merch
            <span className="block text-zinc-500">filtrado a tu manera</span>
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-400">
            Juego, equipo y categoría se acumulan: cada selección afina el resultado sin perder
            las anteriores.
          </p>
        </div>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            apply({ q: searchRef.current?.value.trim() ?? '' })
          }}
          className="flex w-full max-w-sm items-center gap-2"
        >
          <label htmlFor="catalog-search" className="sr-only">
            Buscar productos
          </label>
          <input
            id="catalog-search"
            key={filters.q}
            ref={searchRef}
            type="search"
            defaultValue={filters.q}
            placeholder="Buscar jersey, figura, mousepad…"
            className="h-11 w-full border border-line bg-surface px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-400 focus:outline-none"
          />
          <button
            type="submit"
            className="h-11 border border-line px-4 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
          >
            Buscar
          </button>
        </form>
      </header>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:gap-10">
        <aside aria-label="Filtros del catálogo" className="lg:w-64 lg:shrink-0">
          <div className="flex items-center justify-between pb-5">
            <h2 className="text-xs font-semibold tracking-[0.2em] uppercase">Filtros</h2>
            <button
              type="button"
              onClick={clearAll}
              disabled={activeCount === 0}
              className="text-[11px] text-zinc-400 underline underline-offset-4 transition-colors hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600 disabled:no-underline"
            >
              Limpiar{activeCount > 0 ? ` (${activeCount})` : ''}
            </button>
          </div>

          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-5 lg:sticky lg:top-24">
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
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-6">
            <p aria-live="polite" className="text-sm text-zinc-400">
              {productsQuery.isPending ? (
                'Cargando productos…'
              ) : (
                <>
                  <span className="font-semibold text-white">{total}</span>{' '}
                  {total === 1 ? 'producto' : 'productos'}
                </>
              )}
            </p>

            <div className="flex items-center gap-2">
              <label htmlFor="catalog-sort" className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
                Ordenar
              </label>
              <select
                id="catalog-sort"
                value={filters.sort}
                onChange={(event) => apply({ sort: event.target.value as CatalogSort })}
                className="h-9 border border-line bg-surface px-2 text-xs text-zinc-200 focus:border-zinc-400 focus:outline-none"
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
            <div className="border border-line bg-surface p-8 text-center">
              <p className="text-sm text-zinc-300">No pudimos cargar el catálogo.</p>
              <p className="mt-2 text-xs text-zinc-500">{productsQuery.error.message}</p>
              <button
                type="button"
                onClick={() => productsQuery.refetch()}
                className="mt-5 border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
              >
                Reintentar
              </button>
            </div>
          ) : productsQuery.isPending ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <SkeletonCard key={index} />
              ))}
            </div>
          ) : productsQuery.data.items.length === 0 ? (
            <div className="border border-dashed border-line p-12 text-center">
              <p className="font-display text-2xl uppercase">Sin resultados</p>
              <p className="mt-3 text-sm text-zinc-400">
                No hay productos con esta combinación. Prueba quitando algún filtro.
              </p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-6 border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {productsQuery.data.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {productsQuery.data.totalPages > 1 ? (
                <nav
                  aria-label="Paginación del catálogo"
                  className="mt-10 flex items-center justify-between border-t border-line pt-6"
                >
                  <button
                    type="button"
                    onClick={() => apply({ page: Math.max(filters.page - 1, 1) })}
                    disabled={filters.page <= 1}
                    className="border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <span className="text-xs tracking-[0.16em] text-zinc-400 uppercase">
                    Página {productsQuery.data.page + 1} de {productsQuery.data.totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => apply({ page: filters.page + 1 })}
                    disabled={filters.page >= productsQuery.data.totalPages}
                    className="border border-line px-4 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Siguiente
                  </button>
                </nav>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  )
}
