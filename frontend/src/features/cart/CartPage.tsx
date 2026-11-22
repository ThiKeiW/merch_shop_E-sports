import type { CSSProperties } from 'react'
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
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-28 md:px-8">
      <p className="eyebrow">Tu selección</p>
      <h1 className="display mt-2 text-4xl md:text-6xl">Carrito</h1>

      {items.length === 0 ? (
        <div className="box mt-8 p-10 text-center">
          <p className="text-sm text-white/55">Todavía no añadiste productos.</p>
          <Link to="/catalogo" className="bevel mt-6">
            Ver catálogo
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {items.map((item) => (
            <article key={item.variantId} className="box flex flex-wrap items-center gap-4 p-4">
              <div
                className="card-img relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden text-xs font-extrabold text-white/25"
                style={{ '--g': '#0AC8B9' } as CSSProperties}
              >
                {item.imagePath ? (
                  <img src={item.imagePath} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  item.name.slice(0, 3).toUpperCase()
                )}
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  to={`/producto/${item.slug}`}
                  className="font-bold text-white transition-colors hover:text-white/70"
                >
                  {item.name}
                </Link>
                <p className="text-sm text-white/45">
                  {item.size} / {item.color} · {item.sku}
                </p>
                <p className="text-sm text-white/65">
                  Stock disponible: {item.stock} · {formatPrice(item.unitPrice, item.currency)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  aria-label={`Quitar una unidad de ${item.name}`}
                  onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                  className="bevel bevel-xs"
                >
                  −
                </button>
                <span
                  aria-label={`Cantidad de ${item.name}`}
                  className="w-5 text-center text-sm font-bold"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  aria-label={`Añadir una unidad de ${item.name}`}
                  disabled={item.quantity >= item.stock}
                  onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                  className="bevel bevel-xs"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="ml-2 text-[0.68rem] font-bold tracking-[0.12em] text-white/50 uppercase underline underline-offset-4 transition-colors hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            </article>
          ))}

          <div className="box p-5">
            <div className="flex items-baseline justify-between">
              <span className="eyebrow">Subtotal</span>
              <b className="text-lg text-white">{formatPrice(subtotal, currency)}</b>
            </div>
            <p className="mt-2 text-xs text-white/45">
              El precio final y el stock se recalculan al confirmar el pedido.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {user ? (
                <Link to="/checkout" className="bevel bevel-p">
                  Continuar al pedido
                </Link>
              ) : (
                <Link to="/login" className="bevel bevel-p">
                  Ingresar para continuar
                </Link>
              )}
              <Link to="/catalogo" className="bevel">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
