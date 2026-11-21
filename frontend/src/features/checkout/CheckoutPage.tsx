import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth'
import { selectCartSubtotal, useCartStore } from '@/features/cart'
import { formatPrice } from '@/features/catalog/format'
import { createOrder } from '@/features/orders'
import { ApiError } from '@/shared/api'

export function CheckoutPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const items = useCartStore((state) => state.items)
  const subtotal = useCartStore(selectCartSubtotal)
  const clear = useCartStore((state) => state.clear)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      createOrder({
        items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
      }),
    onSuccess: (order) => {
      clear()
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      navigate(`/pagar/${order.code}`)
    },
    onError: (error: unknown) => {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : 'No pudimos crear el pedido. Inténtalo de nuevo.',
      )
    },
  })

  return (
    <section className="mx-auto w-full max-w-3xl px-4 pb-20 pt-28 md:px-8">
      <p className="eyebrow">Confirmación</p>
      <h1 className="display mt-2 text-4xl md:text-6xl">Finalizar pedido</h1>

      {items.length === 0 ? (
        <div className="box mt-8 p-8 text-center">
          <p className="text-sm text-white/55">Tu carrito está vacío.</p>
          <Link
            to="/catalogo"
            className="mt-5 inline-block text-xs font-bold text-white/65 underline underline-offset-4 transition-colors hover:text-white"
          >
            Volver al catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          <div className="box p-5">
            <p className="eyebrow">Comprador</p>
            <p className="mt-2 font-bold text-white">{user?.displayName}</p>
            <p className="text-sm text-white/55">{user?.email}</p>
          </div>

          <div className="box divide-y divide-white/10">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-4 p-4 text-sm"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{item.name}</p>
                  <p className="mt-1 text-xs text-white/45">
                    {item.size} / {item.color} · {item.quantity} unidad(es)
                  </p>
                </div>
                <p className="shrink-0 text-white/85">
                  {formatPrice(item.unitPrice * item.quantity, item.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="box p-5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Total</span>
              <b className="text-lg text-white">
                {formatPrice(subtotal, items[0]?.currency ?? 'EUR')}
              </b>
            </div>
            <p className="mt-2 text-xs text-white/45">
              Al confirmar se reserva el stock durante 15 minutos. Continuarás al pago seguro.
            </p>

            {errorMessage ? (
              <p role="alert" className="mt-4 text-sm text-red-300">
                {errorMessage}
              </p>
            ) : null}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={mutation.isPending}
                onClick={() => {
                  setErrorMessage(null)
                  mutation.mutate()
                }}
                className="bevel bevel-p"
              >
                {mutation.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
              </button>
              <Link to="/carrito" className="bevel">
                Volver al carrito
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
