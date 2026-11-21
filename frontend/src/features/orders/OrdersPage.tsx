import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { formatPrice } from '@/features/catalog/format'

import { fetchOrders } from './api'
import type { OrderStatus } from './types'

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  FAILED: 'Fallido',
  REFUNDED: 'Reembolsado',
  EXPIRED: 'Expirado/Cancelado',
}

export function OrdersPage() {
  const query = useQuery({ queryKey: ['orders'], queryFn: fetchOrders })

  return (
    <section className="mx-auto w-full max-w-5xl px-4 pb-20 pt-28 md:px-8">
      <p className="eyebrow">Tu historial</p>
      <h1 className="display mt-2 text-4xl md:text-6xl">Mis pedidos</h1>

      <div className="box mt-8 overflow-x-auto">
        {query.isPending ? (
          <p className="px-5 py-10 text-sm text-white/45">Cargando pedidos…</p>
        ) : query.isError ? (
          <p role="alert" className="px-5 py-10 text-sm text-red-300">
            No pudimos cargar tus pedidos.
          </p>
        ) : (query.data ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-white/55">Todavía no realizaste ningún pedido.</p>
            <Link
              to="/catalogo"
              className="mt-5 inline-block text-xs font-bold text-white/65 underline underline-offset-4 transition-colors hover:text-white"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="text-[0.65rem] font-extrabold tracking-[0.2em] text-white/40 uppercase">
              <tr className="border-b border-white/10">
                <th className="px-5 py-3 font-extrabold">Pedido</th>
                <th className="px-5 py-3 font-extrabold">Fecha</th>
                <th className="px-5 py-3 font-extrabold">Artículos</th>
                <th className="px-5 py-3 font-extrabold">Estado</th>
                <th className="px-5 py-3 text-right font-extrabold">Total</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((order) => (
                <tr key={order.id} className="border-b border-white/10 last:border-0">
                  <td className="px-5 py-4">
                    <Link
                      to={`/pedidos/${order.code}`}
                      className="font-mono text-xs font-bold tabular-nums text-white underline underline-offset-4 transition-colors hover:text-white/70"
                    >
                      {order.code.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-white/55">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-4 text-white/55">{order.itemCount}</td>
                  <td className="px-5 py-4">
                    <span className="bevel bevel-xs pointer-events-none">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-bold text-white">
                    {formatPrice(order.total, order.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}
