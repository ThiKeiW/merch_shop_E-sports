import { apiFetch } from '@/shared/api'

import {
  ADMIN_PAGE_SIZE,
  type AdminFacets,
  type AdminProductDetail,
  type AdminProductFilters,
  type AdminProductPage,
  type AdminProductPayload,
} from './types'

export function fetchAdminProducts(filters: AdminProductFilters): Promise<AdminProductPage> {
  const params = new URLSearchParams()

  if (filters.q.trim()) params.set('q', filters.q.trim())
  if (filters.active !== 'all') params.set('active', filters.active)
  if (filters.game) params.set('game', filters.game)
  if (filters.category) params.set('category', filters.category)

  params.set('page', String(filters.page))
  params.set('size', String(ADMIN_PAGE_SIZE))

  return apiFetch<AdminProductPage>(`/admin/products?${params.toString()}`)
}

export function fetchAdminProduct(id: number | string): Promise<AdminProductDetail> {
  return apiFetch<AdminProductDetail>(`/admin/products/${id}`)
}

export function fetchAdminFacets(): Promise<AdminFacets> {
  return apiFetch<AdminFacets>('/admin/facets')
}

export function createAdminProduct(payload: AdminProductPayload): Promise<AdminProductDetail> {
  return apiFetch<AdminProductDetail>('/admin/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function updateAdminProduct(
  id: number | string,
  payload: AdminProductPayload,
): Promise<AdminProductDetail> {
  return apiFetch<AdminProductDetail>(`/admin/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export function deactivateAdminProduct(id: number): Promise<void> {
  return apiFetch<void>(`/admin/products/${id}`, { method: 'DELETE' })
}
