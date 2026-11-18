import { apiFetch } from '@/shared/api'

import type { PaymentIntentDetails } from './types'

export function createPaymentIntent(orderCode: string): Promise<PaymentIntentDetails> {
  return apiFetch<PaymentIntentDetails>('/payments/intent', {
    method: 'POST',
    body: JSON.stringify({ orderCode }),
  })
}
