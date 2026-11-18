export type AdminGame = {
  id: number
  slug: string
  name: string
}

export type AdminSubcategory = {
  id: number
  slug: string
  name: string
}

export type AdminCategory = AdminSubcategory & {
  subcategories: AdminSubcategory[]
}

export type AdminTeam = {
  id: number
  slug: string
  name: string
  gameSlug: string
}

export type AdminFacets = {
  games: AdminGame[]
  categories: AdminCategory[]
  teams: AdminTeam[]
}

export type AdminProductSummary = {
  id: number
  slug: string
  name: string
  price: number
  currency: string
  active: boolean
  featured: boolean
  game: string
  category: string
  subcategory: string | null
  team: string | null
  imageUrl: string | null
  stock: number
  variantCount: number
}

export type AdminProductPage = {
  items: AdminProductSummary[]
  page: number
  size: number
  total: number
  totalPages: number
}

export type AdminVariant = {
  id?: number
  sku?: string | null
  size: string
  color: string
  priceDelta: number
  stock: number
}

export type AdminImage = {
  id?: number
  path: string
  sourceUrl?: string | null
  kind: string
  primary: boolean
}

export type AdminProductDetail = {
  id: number
  slug: string
  name: string
  description: string | null
  price: number
  currency: string
  active: boolean
  featured: boolean
  game: string
  category: string
  subcategory: string | null
  team: string | null
  variants: AdminVariant[]
  images: AdminImage[]
}

export type AdminVariantPayload = {
  sku?: string | null
  size: string
  color: string
  priceDelta: number
  stock: number
}

export type AdminImagePayload = {
  path: string
  sourceUrl?: string | null
  kind: string
  primary: boolean
}

export type AdminProductPayload = {
  slug?: string | null
  name: string
  description?: string | null
  game: string
  category: string
  subcategory?: string | null
  team?: string | null
  price: number
  currency: string
  featured: boolean
  active: boolean
  variants: AdminVariantPayload[]
  images: AdminImagePayload[]
}

export type AdminProductFilters = {
  q: string
  active: 'all' | 'true' | 'false'
  game: string
  category: string
  page: number
}

export const ADMIN_PAGE_SIZE = 10
