import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { formatPrice } from '@/features/catalog/format'
import { confirmPayment } from '@/features/payment/api'

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
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const queryClient = useQueryClient()
  const checkedIntent = useRef(false)
  const pollCount = useRef(0)
  const [paymentStatus, setPaymentStatus] = useState<string | null>(() => {
    const state = location.state as { paymentStatus?: string } | null
    return state?.paymentStatus ?? null
  })

  const query = useQuery({
    queryKey: ['orders', code],
    queryFn: () => fetchOrder(code),
    enabled: code.length > 0,
  })
  const cancel = useMutation({
    mutationFn: () => cancelOrder(code),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders', code] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
    },
  })
  const confirm = useMutation({
    mutationFn: () => confirmPayment(code),
    onSuccess: (result) => {
      setPaymentStatus(result.paymentStatus)
      void queryClient.invalidateQueries({ queryKey: ['orders'] })
      void queryClient.invalidateQueries({ queryKey: ['orders', code] })
      void queryClient.invalidateQueries({ queryKey: ['catalog'] })
      if (searchParams.has('payment_intent') || searchParams.has('payment_intent_client_secret')) {
        navigate(`/pedidos/${code}`, {
          replace: true,
          state: { paymentStatus: result.paymentStatus },
        })
      }
    },
  })
  const confirmMutate = confirm.mutate

  const hasStripeReturn =
    searchParams.has('payment_intent') || searchParams.has('payment_intent_client_secret')
  const processingPayment = paymentStatus === 'processing'
  const paidButPending = paymentStatus === 'succeeded' && query.data?.status === 'PENDING'

  useEffect(() => {
    if (checkedIntent.current || query.data?.status !== 'PENDING') {
      return
    }
    if (!query.data.stripePaymentIntentId && !hasStripeReturn) {
      return
    }
    checkedIntent.current = true
    confirmMutate()
  }, [query.data, hasStripeReturn, confirmMutate])

  useEffect(() => {
    if (paymentStatus !== 'processing' || query.data?.status !== 'PENDING' || pollCount.current >= 15) {
      return
    }
    pollCount.current += 1
    const timer = window.setTimeout(() => confirmMutate(), 4000)
    return () => window.clearTimeout(timer)
  }, [paymentStatus, query.data?.status, confirmMutate])

  return (
    <section className="mx-auto w-full max-w-4xl px-4 pb-20 pt-28 md:px-8">
      <Link
        to="/pedidos"
        className="text-[0.7rem] font-extrabold tracking-[0.16em] text-white/55 uppercase underline underline-offset-4 transition-colors hover:text-white"
      >
        ← Mis pedidos
      </Link>
      <p className="eyebrow mt-10">Detalle</p>
      <h1 className="display mt-2 break-all text-3xl md:text-5xl">{code}</h1>

      {query.isPending ? (
        <p className="mt-8 text-sm text-white/45">Cargando pedido…</p>
      ) : query.isError ? (
        <p role="alert" className="mt-8 text-sm text-red-300">
          No encontramos ese pedido o no pertenece a tu cuenta.
        </p>
      ) : query.data ? (
        <div className="mt-8 space-y-6">
          <div className="box grid gap-5 p-5 sm:grid-cols-2">
            <div>
              <p className="eyebrow tracking-[0.2em]">Estado</p>
              <p className="mt-2 text-lg font-bold text-white">{STATUS_LABEL[query.data.status]}</p>
            </div>
            {query.data.reservationExpiresAt ? (
              <div className="sm:text-right">
                <p className="eyebrow tracking-[0.2em]">Reserva hasta</p>
                <p className="mt-2 text-sm text-white/80">
                  {new Date(query.data.reservationExpiresAt).toLocaleString()}
                </p>
              </div>
            ) : null}
            {query.data.status === 'PENDING' ? (
              <div className="flex flex-wrap gap-3 sm:col-span-2">
                <button
                  type="button"
                  disabled={confirm.isPending || processingPayment || paidButPending}
                  onClick={() => confirmMutate()}
                  className="bevel bevel-sm"
                >
                  {confirm.isPending ? 'Comprobando…' : 'Actualizar estado del pago'}
                </button>
                {!processingPayment && !paidButPending ? (
                  <Link to={`/pagar/${code}`} className="bevel bevel-p bevel-sm">
                    Pagar ahora
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={cancel.isPending || processingPayment || paidButPending}
                  onClick={() => cancel.mutate()}
                  className="bevel bevel-sm"
                >
                  Cancelar pedido
                </button>
              </div>
            ) : null}
          </div>

          {processingPayment ? (
            <p role="status" className="box p-4 text-sm text-white/75">
              El pago está en proceso. Estamos esperando la confirmación de Stripe; no vuelvas a
              introducir los datos de la tarjeta.
            </p>
          ) : null}
          {paidButPending ? (
            <p role="status" className="box p-4 text-sm text-white/75">
              Stripe ya confirmó el pago. Actualizando el pedido…
            </p>
          ) : null}
          {confirm.isError ? (
            <p role="alert" className="text-sm text-red-300">
              No pudimos comprobar el estado del pago. Puedes volver a intentarlo.
            </p>
          ) : null}
          {cancel.isError ? (
            <p role="alert" className="text-sm text-red-300">
              No se pudo cancelar el pedido. Puede que ya haya expirado.
            </p>
          ) : null}

          <div className="box divide-y divide-white/10">
            {query.data.items.map((item) => (
              <article
                key={`${item.variantId}-${item.productName}`}
                className="flex items-center gap-4 p-4"
              >
                {item.imagePath ? (
                  <img
                    src={item.imagePath}
                    alt=""
                    className="h-16 w-16 shrink-0 object-cover"
                  />
                ) : (
                  <div className="card-img grid h-16 w-16 shrink-0 place-items-center text-[0.6rem] font-extrabold text-white/25">
                    {item.productName.slice(0, 3).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-white">{item.productName}</p>
                  <p className="mt-1 text-sm text-white/45">
                    {item.variantLabel} · {item.quantity} × {formatPrice(item.unitPrice, query.data.currency)}
                  </p>
                </div>
                <p className="text-sm text-white/85">
                  {formatPrice(item.lineTotal, query.data.currency)}
                </p>
              </article>
            ))}
          </div>

          <dl className="ml-auto w-full max-w-xs space-y-2 text-sm">
            <div className="flex justify-between text-white/55">
              <dt>Subtotal</dt>
              <dd>{formatPrice(query.data.subtotal, query.data.currency)}</dd>
            </div>
            <div className="flex justify-between text-white/55">
              <dt>Envío</dt>
              <dd>{formatPrice(query.data.shippingCost, query.data.currency)}</dd>
            </div>
            <div className="flex justify-between border-t border-white/10 pt-2 font-extrabold text-white">
              <dt>Total</dt>
              <dd>{formatPrice(query.data.total, query.data.currency)}</dd>
            </div>
          </dl>
          <p className="text-xs text-white/40">
            El cobro con tarjeta se procesa de forma segura con Stripe. La reserva se libera al expirar.
          </p>
        </div>
      ) : null}
    </section>
  )
}
