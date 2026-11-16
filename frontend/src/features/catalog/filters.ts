import { CATALOG_SORTS } from './types'
import type { CatalogFilters, CatalogSort } from './types'

export const PAGE_SIZE = 12
export const DEFAULT_SORT: CatalogSort = 'relevance'

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function parseList(params: URLSearchParams, key: string): string[] {
  return unique(params.getAll(key))
}

export function parseFilters(params: URLSearchParams): CatalogFilters {
  const sortParam = params.get('sort')
  const sort = CATALOG_SORTS.includes(sortParam as CatalogSort)
    ? (sortParam as CatalogSort)
    : DEFAULT_SORT
  const pageParam = Number.parseInt(params.get('page') ?? '1', 10)

  return {
    games: parseList(params, 'game'),
    teams: parseList(params, 'team'),
    categories: parseList(params, 'category'),
    q: (params.get('q') ?? '').trim(),
    sort,
    page: Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1,
  }
}

export function toSearchParams(filters: CatalogFilters, patch: Partial<CatalogFilters> = {}): URLSearchParams {
  const next: CatalogFilters = { ...filters, ...patch }
  const params = new URLSearchParams()

  for (const game of unique(next.games)) params.append('game', game)
  for (const team of unique(next.teams)) params.append('team', team)
  for (const category of unique(next.categories)) params.append('category', category)

  if (next.q) params.set('q', next.q)
  if (next.sort !== DEFAULT_SORT) params.set('sort', next.sort)
  if (next.page > 1) params.set('page', String(next.page))

  return params
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value]
}

export function activeFilterCount(filters: CatalogFilters): number {
  return (
    filters.games.length +
    filters.teams.length +
    filters.categories.length +
    (filters.q ? 1 : 0) +
    (filters.sort !== DEFAULT_SORT ? 1 : 0)
  )
}
