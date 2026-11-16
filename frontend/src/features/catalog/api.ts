import { apiFetch } from '@/shared/api'

import { PAGE_SIZE } from './filters'
import type { CatalogFacets, CatalogFilters, CatalogPage } from './types'

function toProductParams(filters: CatalogFilters): URLSearchParams {
  const params = new URLSearchParams()

  for (const game of filters.games) params.append('game', game)
  for (const team of filters.teams) params.append('team', team)
  for (const category of filters.categories) params.append('category', category)

  if (filters.q) params.set('q', filters.q)
  if (filters.sort !== 'relevance') params.set('sort', filters.sort)

  params.set('page', String(Math.max(filters.page - 1, 0)))
  params.set('size', String(PAGE_SIZE))

  return params
}

export function fetchProducts(filters: CatalogFilters): Promise<CatalogPage> {
  return apiFetch<CatalogPage>(`/catalog/products?${toProductParams(filters).toString()}`)
}

export function fetchFacets(games: string[]): Promise<CatalogFacets> {
  const params = new URLSearchParams()
  for (const game of games) params.append('game', game)

  const query = params.toString()
  return apiFetch<CatalogFacets>(`/catalog/facets${query ? `?${query}` : ''}`)
}
