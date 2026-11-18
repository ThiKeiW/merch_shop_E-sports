export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED'

export type OrderItem = {
  productId: number
  variantId: number
  productName: string
  variantLabel: string
  unitPrice: number
  quantity: number
  lineTotal: number
  imagePath: string | null
}

export type Order = {
  id: number
  code: string
  status: OrderStatus
  subtotal: number
  shippingCost: number
  total: number
  currency: string
  reservationExpiresAt: string | null
  createdAt: string
  itemCount: number
  items: OrderItem[]
}

export type CreateOrderPayload = {
  items: Array<{ variantId: number; quantity: number }>
}
