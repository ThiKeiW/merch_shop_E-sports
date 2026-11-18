import { Elements } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { formatPrice } from '@/features/catalog/format'
import { fetchOrder } from '@/features/orders'
import { ApiError } from '@/shared/api'

import { createPaymentIntent } from './api'
import { PaymentForm } from './PaymentForm'

export function PaymentPage() {
  const { code = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const orderQuery = useQuery({
    queryKey: ['orders', code],
    queryFn: () => fetchOrder(code),
    enabled: code.length > 0,
  })

  const intentQuery = useQuery({
    queryKey: ['payment-intent', code],
    queryFn: () => createPaymentIntent(code),
    enabled: code.length > 0 && orderQuery.data?.status === 'PENDING',
  })

  const stripePromise = useMemo(
    () => (intentQuery.data?.publishableKey ? loadStripe(intentQuery.data.publishableKey) : null),
    [intentQuery.data],
  )

  function handlePaid() {
    void queryClient.invalidateQueries({ queryKey: ['orders'] })
    void queryClient.invalidateQueries({ queryKey: ['orders', code] })
    navigate(`/pedidos/${code}`)
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <Link to="/pedidos" className="text-[11px] tracking-[0.16em] text-zinc-500 uppercase underline">
        ← Mis pedidos
      </Link>
      <p className="mt-8 text-xs font-semibold tracking-[0.3em] text-zinc-500 uppercase">Pago seguro</p>
      <h1 className="font-display mt-3 break-all text-3xl tracking-tight uppercase">{code}</h1>

      {orderQuery.isPending ? (
        <p className="mt-8 text-sm text-zinc-500">Cargando pedido…</p>
      ) : orderQuery.isError ? (
        <p role="alert" className="mt-8 text-sm text-red-300">
          No encontramos ese pedido o no pertenece a tu cuenta.
        </p>
      ) : orderQuery.data && orderQuery.data.status !== 'PENDING' ? (
        <div className="mt-8 border border-line bg-surface p-6">
          <p className="text-sm text-zinc-300">Este pedido ya no admite pagos.</p>
          <Link
            to={`/pedidos/${code}`}
            className="mt-5 inline-block text-xs text-zinc-300 underline underline-offset-4"
          >
            Ver detalle del pedido
          </Link>
        </div>
      ) : intentQuery.isPending ? (
        <p className="mt-8 text-sm text-zinc-500">Preparando el pago…</p>
      ) : intentQuery.isError ? (
        <p role="alert" className="mt-8 text-sm text-red-300">
          {intentQuery.error instanceof ApiError
            ? intentQuery.error.message
            : 'No pudimos iniciar el pago. Inténtalo de nuevo.'}
        </p>
      ) : intentQuery.data && stripePromise ? (
        <div className="mt-8 border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between text-sm">
            <span className="tracking-[0.18em] text-zinc-500 uppercase">Total a pagar</span>
            <span className="font-semibold text-white">
              {formatPrice(orderQuery.data?.total ?? 0, orderQuery.data?.currency ?? 'EUR')}
            </span>
          </div>
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret: intentQuery.data.clientSecret,
              appearance: { theme: 'night' },
              locale: 'es',
            }}
          >
            <PaymentForm orderCode={code} onPaid={handlePaid} />
          </Elements>
        </div>
      ) : (
        <p role="alert" className="mt-8 text-sm text-red-300">
          Stripe no está configurado en este entorno.
        </p>
      )}
    </section>
  )
}
