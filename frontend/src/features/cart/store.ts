import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { CartItem, CartItemInput } from './types'

type CartState = {
  items: CartItem[]
  add: (item: CartItemInput, quantity?: number) => void
  updateQuantity: (variantId: number, quantity: number) => void
  remove: (variantId: number) => void
  clear: () => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      add: (item, quantity = 1) =>
        set((state) => {
          if (item.stock <= 0) {
            return state
          }
          const max = item.stock
          const existing = state.items.find((line) => line.variantId === item.variantId)
          if (existing) {
            return {
              items: state.items.map((line) =>
                line.variantId === item.variantId
                  ? { ...line, ...item, quantity: Math.min(max, line.quantity + quantity) }
                  : line,
              ),
            }
          }
          return {
            items: [...state.items, { ...item, quantity: Math.min(max, Math.max(1, quantity)) }],
          }
        }),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.flatMap((line) => {
            if (line.variantId !== variantId) {
              return [line]
            }
            const next = Math.min(line.stock, Math.max(0, quantity))
            return next === 0 ? [] : [{ ...line, quantity: next }]
          }),
        })),
      remove: (variantId) =>
        set((state) => ({ items: state.items.filter((line) => line.variantId !== variantId) })),
      clear: () => set({ items: [] }),
    }),
    { name: 'merch:cart', version: 1, partialize: (state) => ({ items: state.items }) },
  ),
)

export const selectCartCount = (state: CartState) =>
  state.items.reduce((total, line) => total + line.quantity, 0)

export const selectCartSubtotal = (state: CartState) =>
  state.items.reduce((total, line) => total + line.unitPrice * line.quantity, 0)
