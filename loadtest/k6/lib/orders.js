import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, JSON_HEADERS, authHeaders } from './config.js';

export function createOrder(token, variantId, quantity = 1) {
  const response = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ items: [{ variantId, quantity }] }),
    { headers: authHeaders(token), tags: { name: 'POST /api/orders' } },
  );

  check(response, {
    'pedido responde 201': (res) => res.status === 201,
    'pedido devuelve code': (res) => Boolean(res.json('code')),
  });

  return response;
}

export function createIntent(token, orderCode) {
  const response = http.post(
    `${BASE_URL}/api/payments/intent`,
    JSON.stringify({ orderCode }),
    { headers: authHeaders(token), tags: { name: 'POST /api/payments/intent' } },
  );

  check(response, {
    'intent responde 200': (res) => res.status === 200,
    'intent devuelve paymentIntentId': (res) => Boolean(res.json('paymentIntentId')),
  });

  return response;
}

export function confirmPayment(token, orderCode) {
  const response = http.post(
    `${BASE_URL}/api/payments/${encodeURIComponent(orderCode)}/confirm`,
    null,
    { headers: authHeaders(token), tags: { name: 'POST /api/payments/:code/confirm' } },
  );

  check(response, {
    'confirm responde 200': (res) => res.status === 200,
  });

  return response;
}

export function sendSucceededWebhook(orderCode, intentId) {
  const payload = JSON.stringify({
    id: `evt_loadtest_${orderCode}`,
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: intentId,
        metadata: { order_code: orderCode },
      },
    },
  });

  const response = http.post(
    `${BASE_URL}/api/webhooks/stripe`,
    payload,
    { headers: JSON_HEADERS, tags: { name: 'POST /api/webhooks/stripe' } },
  );

  check(response, {
    'webhook responde 200': (res) => res.status === 200,
    'webhook recibido': (res) => res.json('received') === true,
  });

  return response;
}
