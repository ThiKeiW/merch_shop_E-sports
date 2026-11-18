import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'

import { formatPrice } from '@/features/catalog/format'

import { cancelOrder, fetchOrder } from './api'
import type { OrderStatus } from './types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
  EXPIRED: 'Expirado/Cancelado',
}

export function OrderDetailPage() {
  const { code = '' } = useParams()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['orders', code],
    queryFn: () => fetchOrder(code),
    enabled: code.length > 0,
  })
  const cancel = useMutation({
    mutationFn: () => cancelOrder(code),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      queryClient.invalidateQueries({ queryKey: ['orders', code] })
    },
  })

  return (
    <section className="mx-auto w-full max-w-4xl px-4 py-12 sm:px-6">
      <Link to="/pedidos" className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase underline">
        ← Mis pedidos
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Detalle</p>
      <h1 className="font-display mt-3 break-all text-3xl tracking-tight uppercase">{code}</h1>

      {query.isPending ? (
        <p className="mt-8 text-sm text-zinc-500">Cargando pedido…</p>
      ) : query.isError ? (
        <p role="alert" className="mt-8 text-sm text-red-300">
          No encontramos ese pedido o no pertenece a tu cuenta.
        </p>
      ) : query.data ? (
        <div className="mt-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border border-line bg-surface p-5">
            <div>
              <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">Estado</p>
              <p className="mt-1 text-sm font-semibold text-white">
                {STATUS_LABEL[query.data.status]}
              </p>
            </div>
            {query.data.reservationExpiresAt ? (
              <div>
                <p className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase">
                  Reserva hasta
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {new Date(query.data.reservationExpiresAt).toLocaleString()}
                </p>
              </div>
            ) : null}
            {query.data.status === 'PENDING' ? (
              <div className="flex flex-wrap gap-3">
                <Link
                  to={`/pagar/${code}`}
                  className="border border-white bg-white px-5 py-2 text-[11px] font-bold tracking-[0.16em] text-ink uppercase"
                >
                  Pagar ahora
                </Link>
                <button
                  type="button"
                  disabled={cancel.isPending}
                  onClick={() => cancel.mutate()}
                  className="border border-line px-5 py-2 text-[11px] font-semibold tracking-[0.16em] uppercase transition-colors hover:border-red-400 hover:text-red-300 disabled:opacity-50"
                >
                  Cancelar pedido
                </button>
              </div>
            ) : null}
          </div>

          {cancel.isError ? (
            <p role="alert" className="text-sm text-red-300">
              No se pudo cancelar el pedido. Puede que ya haya expirado.
            </p>
          ) : null}

          <div className="border border-line bg-surface">
            {query.data.items.map((item) => (
              <article
                key={`${item.variantId}-${item.productName}`}
                className="flex items-center gap-4 border-b border-line/60 p-4 last:border-0"
              >
                {item.imagePath ? (
                  <img src={item.imagePath} alt="" className="h-16 w-16 border border-line object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-zinc-100">{item.productName}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {item.variantLabel} · {item.quantity} × {formatPrice(item.unitPrice, query.data.currency)}
                  </p>
                </div>
                <p className="text-sm text-zinc-200">
                  {formatPrice(item.lineTotal, query.data.currency)}
                </p>
              </article>
            ))}
          </div>

          <dl className="ml-auto max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-zinc-400">
              <dt>Subtotal</dt>
              <dd>{formatPrice(query.data.subtotal, query.data.currency)}</dd>
            </div>
            <div className="flex justify-between text-zinc-400">
              <dt>Envío</dt>
              <dd>{formatPrice(query.data.shippingCost, query.data.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-semibold text-white">
              <dt>Total</dt>
              <dd>{formatPrice(query.data.total, query.data.currency)}</dd>
            </div>
          </dl>
          <p className="text-[11px] text-zinc-500">
            El cobro con tarjeta se procesa de forma segura con Stripe. La reserva se libera al expirar.
          </p>
        </div>
      ) : null}
    </section>
  )
}
