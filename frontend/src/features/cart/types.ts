export type CartItem = {
  variantId: number
  productId: number
  slug: string
  name: string
  sku: string
  size: string
  color: string
  unitPrice: number
  currency: string
  imagePath: string | null
  stock: number
  quantity: number
}

export type CartItemInput = Omit<CartItem, 'quantity'>
