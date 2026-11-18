import { apiFetch } from '@/shared/api'

import type { CreateOrderPayload, Order } from './types'

export function fetchOrders(): Promise<Order[]> {
  return apiFetch<Order[]>('/orders')
}

export function fetchOrder(code: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${encodeURIComponent(code)}`)
}

export function createOrder(payload: CreateOrderPayload): Promise<Order> {
  return apiFetch<Order>('/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export function cancelOrder(code: string): Promise<Order> {
  return apiFetch<Order>(`/orders/${encodeURIComponent(code)}/cancel`, { method: 'POST' })
}
