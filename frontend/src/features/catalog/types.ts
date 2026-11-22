export type CatalogGame = {
  id: number
  slug: string
  name: string
  accentColor: string
}

export type CatalogTeam = {
  id: number
  slug: string
  name: string
  gameSlug: string
}

export type CatalogCategory = {
  id: number
  slug: string
  name: string
}

export type CatalogFacets = {
  games: CatalogGame[]
  teams: CatalogTeam[]
  categories: CatalogCategory[]
}

export type ProductSummary = {
  id: number
  slug: string
  name: string
  description: string | null
  price: number
  currency: string
  featured: boolean
  imageUrl?: string | null
  game: CatalogGame
  category: CatalogCategory
  team: CatalogTeam | null
}

export type CatalogPage = {
  items: ProductSummary[]
  page: number
  size: number
  total: number
  totalPages: number
}

export type ProductVariant = {
  id: number
  sku: string
  size: string
  color: string
  priceDelta: number
  finalPrice: number
  stock: number
  available: boolean
}

export type ProductImage = {
  id: number
  kind: string
  path: string
  primary: boolean
}

export type ProductDetail = ProductSummary & {
  variants: ProductVariant[]
  images: ProductImage[]
}

export const CATALOG_SORTS = ['relevance', 'newest', 'price-asc', 'price-desc', 'name'] as const

export type CatalogSort = (typeof CATALOG_SORTS)[number]

export type CatalogFilters = {
  games: string[]
  teams: string[]
  categories: string[]
  q: string
  sort: CatalogSort
  page: number
}
