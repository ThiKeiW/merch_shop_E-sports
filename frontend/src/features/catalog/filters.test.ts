import { describe, expect, it } from 'vitest'

import { activeFilterCount, parseFilters, toggleValue, toSearchParams } from './filters'

describe('parseFilters', () => {
  it('usa valores por defecto cuando no hay parámetros', () => {
    expect(parseFilters(new URLSearchParams())).toEqual({
      games: [],
      teams: [],
      categories: [],
      q: '',
      sort: 'relevance',
      page: 1,
    })
  })

  it('lee listas repetidas, las deduplica y valida orden y página', () => {
    const filters = parseFilters(
      new URLSearchParams('game=valorant&game=cs2&game=valorant&team=sentinels&q=%20figura%20&sort=price-asc&page=3'),
    )

    expect(filters.games).toEqual(['valorant', 'cs2'])
    expect(filters.teams).toEqual(['sentinels'])
    expect(filters.q).toBe('figura')
    expect(filters.sort).toBe('price-asc')
    expect(filters.page).toBe(3)
  })

  it('ignora orden y página inválidos', () => {
    const filters = parseFilters(new URLSearchParams('sort=lo-que-sea&page=-2'))

    expect(filters.sort).toBe('relevance')
    expect(filters.page).toBe(1)
  })
})

describe('toSearchParams', () => {
  const base = parseFilters(
    new URLSearchParams('game=valorant&team=sentinels&category=accesorios&q=pad&sort=price-asc&page=2'),
  )

  it('serializa todos los filtros activos', () => {
    const params = toSearchParams(base)

    expect(params.getAll('game')).toEqual(['valorant'])
    expect(params.getAll('team')).toEqual(['sentinels'])
    expect(params.getAll('category')).toEqual(['accesorios'])
    expect(params.get('q')).toBe('pad')
    expect(params.get('sort')).toBe('price-asc')
    expect(params.get('page')).toBe('2')
  })

  it('omite valores por defecto y aplica parches sin perder el resto', () => {
    const params = toSearchParams(base, { page: 1, sort: 'relevance', q: '' })

    expect(params.get('page')).toBeNull()
    expect(params.get('sort')).toBeNull()
    expect(params.get('q')).toBeNull()
    expect(params.getAll('game')).toEqual(['valorant'])
    expect(params.getAll('team')).toEqual(['sentinels'])
  })
})

describe('toggleValue', () => {
  it('agrega y quita valores sin duplicar', () => {
    expect(toggleValue([], 'valorant')).toEqual(['valorant'])
    expect(toggleValue(['valorant'], 'valorant')).toEqual([])
    expect(toggleValue(['valorant'], 'cs2')).toEqual(['valorant', 'cs2'])
  })
})

describe('activeFilterCount', () => {
  it('cuenta solo los filtros activos', () => {
    expect(activeFilterCount(parseFilters(new URLSearchParams()))).toBe(0)
    expect(
      activeFilterCount(
        parseFilters(new URLSearchParams('game=valorant&game=cs2&q=pad&sort=name&page=2')),
      ),
    ).toBe(4)
  })
})
