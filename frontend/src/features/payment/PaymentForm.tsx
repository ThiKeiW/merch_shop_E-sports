import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { useState } from 'react'
import type { FormEvent } from 'react'

type Props = {
  orderCode: string
  onPaid: (paymentStatus: string) => Promise<void> | void
}

export function PaymentForm({ orderCode, onPaid }: Props) {
  const stripe = useStripe()
  const elements = useElements()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) {
      return
    }
    setProcessing(true)
    setErrorMessage(null)
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
      confirmParams: {
        return_url: `${window.location.origin}/pedidos/${orderCode}`,
      },
    })
    setProcessing(false)
    if (error) {
      setErrorMessage(error.message ?? 'No pudimos procesar el pago.')
      return
    }
    try {
      await onPaid(paymentIntent?.status ?? 'unknown')
    } catch {
      setErrorMessage('El pago se realizó, pero no pudimos actualizar el pedido. Consulta Mis pedidos.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-5">
      <PaymentElement />
      {errorMessage ? (
        <p role="alert" className="text-sm text-red-300">
          {errorMessage}
        </p>
      ) : null}
      <button type="submit" disabled={!stripe || processing} className="bevel bevel-p w-full py-3.5">
        {processing ? 'Procesando pago…' : `Pagar pedido ${orderCode}`}
      </button>
    </form>
  )
}
