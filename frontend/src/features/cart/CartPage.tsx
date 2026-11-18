import { Link } from 'react-router-dom'

import { formatPrice } from '@/features/catalog/format'
import { useAuthStore } from '@/features/auth'

import { selectCartSubtotal, useCartStore } from './store'

export function CartPage() {
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const remove = useCartStore((state) => state.remove)
  const subtotal = useCartStore(selectCartSubtotal)
  const currency = items[0]?.currency ?? 'EUR'
  const user = useAuthStore((state) => state.user)

  return (
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Tu selección</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Carrito</h1>

      {items.length === 0 ? (
        <div className="mt-8 border border-line bg-surface px-5 py-12 text-center">
          <p className="text-sm text-zinc-400">Todavía no añadiste productos.</p>
          <Link
            to="/catalogo"
            className="mt-6 inline-block border border-line px-5 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-zinc-500 hover:text-white"
          >
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <article
              key={item.variantId}
              className="flex flex-col gap-4 border border-line bg-surface p-4 sm:flex-row sm:items-center"
            >
              {item.imagePath ? (
                <img
                  src={item.imagePath}
                  alt=""
                  className="h-20 w-20 shrink-0 border border-line object-cover"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <Link
                  to={`/producto/${item.slug}`}
                  className="text-sm font-semibold text-zinc-100 hover:text-white"
                >
                  {item.name}
                </Link>
                <p className="mt-1 text-xs text-zinc-500">
                  {item.size} / {item.color} · {item.sku}
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Stock disponible: {item.stock} · {formatPrice(item.unitPrice, item.currency)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Quitar una unidad de ${item.name}`}
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="h-8 w-8 border border-line text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
                >
                  −
                </button>
                <span aria-label={`Cantidad de ${item.name}`} className="w-6 text-center text-sm">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Añadir una unidad de ${item.name}`}
                  disabled={item.quantity >= item.stock}
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  className="h-8 w-8 border border-line text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:text-zinc-600"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="ml-2 text-[11px] text-zinc-500 underline underline-offset-4 transition-colors hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}

          <div className="border border-line bg-surface p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="tracking-[0.18em] text-zinc-500 uppercase">Subtotal</span>
              <span className="font-semibold text-white">{formatPrice(subtotal, currency)}</span>
            </div>
            <p className="mt-2 text-[11px] text-zinc-500">
              El precio final y el stock se recalculan al confirmar el pedido.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <Link
                  to="/checkout"
                  className="border border-white bg-white px-6 py-2.5 text-[11px] font-bold tracking-[0.18em] text-ink uppercase"
                >
                  Continuar al pedido
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="border border-white bg-white px-6 py-2.5 text-[11px] font-bold tracking-[0.18em] text-ink uppercase"
                >
                  Ingresar para continuar
                </Link>
              )}
              <Link
                to="/catalogo"
                className="border border-line px-6 py-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase transition-colors hover:border-zinc-500"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
