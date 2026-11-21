export type PaymentIntentDetails = {
  orderCode: string
  paymentIntentId: string
  clientSecret: string
  publishableKey: string
}

export type PaymentConfirmation = {
  orderCode: string
  orderStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'EXPIRED'
  paymentStatus: string
}
