import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/features/auth'
import { selectCartSubtotal, useCartStore } from '@/features/cart'
import { formatPrice } from '@/features/catalog/format'
import { createOrder } from '@/features/orders'
import { ApiError } from '@/shared/api'

export function CheckoutPage() {
  const navigate = useNavigate()
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
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Confirmación</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Finalizar pedido</h1>

      {items.length === 0 ? (
        <div className="mt-8 border border-line bg-surface p-6 text-center">
          <p className="text-sm text-zinc-400">Tu carrito está vacío.</p>
          <Link
            to="/catalogo"
            className="mt-5 inline-block text-xs text-zinc-300 underline underline-offset-4"
          >
            Volver al catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          <div className="border border-line bg-surface p-5">
            <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Comprador</p>
            <p className="mt-2 text-sm text-zinc-200">{user?.displayName}</p>
            <p className="mt-1 text-sm text-zinc-400">{user?.email}</p>
          </div>

          <div className="border border-line bg-surface">
            {items.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-4 border-b border-line/60 p-4 text-sm last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-zinc-100">{item.name}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.size} / {item.color} · {item.quantity} unidad(es)
                  </p>
                </div>
                <p className="shrink-0 text-zinc-200">
                  {formatPrice(item.unitPrice * item.quantity, item.currency)}
                </p>
              </div>
            ))}
          </div>

          <div className="border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="tracking-[0.18em] text-zinc-500 uppercase">Total</span>
              <span className="font-semibold text-white">
                {formatPrice(subtotal, items[0]?.currency ?? 'EUR')}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
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
                className="border border-white bg-white px-6 py-2.5 text-[11px] font-bold tracking-[0.18em] text-ink uppercase disabled:cursor-not-allowed disabled:opacity-50"
              >
                {mutation.isPending ? 'Creando pedido…' : 'Confirmar pedido'}
              </button>
              <Link
                to="/carrito"
                className="border border-line px-6 py-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors hover:border-zinc-500"
              >
                Volver al carrito
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
