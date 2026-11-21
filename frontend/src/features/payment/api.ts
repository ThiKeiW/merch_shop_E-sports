import { apiFetch } from '@/shared/api'

import type { PaymentConfirmation, PaymentIntentDetails } from './types'

export function createPaymentIntent(orderCode: string): Promise<PaymentIntentDetails> {
  return apiFetch<PaymentIntentDetails>('/payments/intent', {
    method: 'POST',
    body: JSON.stringify({ orderCode }),
  })
}

export function confirmPayment(orderCode: string): Promise<PaymentConfirmation> {
  return apiFetch<PaymentConfirmation>(
    `/payments/${encodeURIComponent(orderCode)}/confirm`,
    { method: 'POST' },
  )
}
