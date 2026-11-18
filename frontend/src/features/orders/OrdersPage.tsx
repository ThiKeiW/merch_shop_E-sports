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
    <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <p className="text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Tu historial</p>
      <h1 className="font-display mt-3 text-3xl tracking-tight uppercase">Mis pedidos</h1>

      <div className="mt-8 border border-line bg-surface">
        {query.isPending ? (
          <p className="px-4 py-8 text-sm text-zinc-500">Cargando pedidos…</p>
        ) : query.isError ? (
          <p role="alert" className="px-4 py-8 text-sm text-red-300">
            No pudimos cargar tus pedidos.
          </p>
        ) : (query.data ?? []).length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm text-zinc-400">Todavía no realizaste ningún pedido.</p>
            <Link
              to="/catalogo"
              className="mt-5 inline-block text-xs text-zinc-300 underline underline-offset-4"
            >
              Explorar catálogo
            </Link>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="text-[11px] tracking-[0.14em] text-zinc-500 uppercase">
              <tr className="border-b border-line">
                <th className="px-4 py-2.5 font-semibold">Pedido</th>
                <th className="px-4 py-2.5 font-semibold">Fecha</th>
                <th className="px-4 py-2.5 font-semibold">Artículos</th>
                <th className="px-4 py-2.5 font-semibold">Estado</th>
                <th className="px-4 py-2.5 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {query.data?.map((order) => (
                <tr key={order.id} className="border-b border-line/60 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      to={`/pedidos/${order.code}`}
                      className="font-mono text-xs text-zinc-200 underline underline-offset-4"
                    >
                      {order.code.slice(0, 12)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{order.itemCount}</td>
                  <td className="px-4 py-3">
                    <span className="border border-line px-2 py-0.5 text-[10px] font-bold tracking-[0.12em] uppercase">
                      {STATUS_LABEL[order.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-zinc-200">
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
