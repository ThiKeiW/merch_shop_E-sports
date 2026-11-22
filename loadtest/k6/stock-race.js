import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter } from 'k6/metrics';

import { login } from './lib/auth.js';
import { BASE_URL, authHeaders } from './lib/config.js';

const VUS = Number(__ENV.VUS || 50);
const VARIANT_ID = Number(__ENV.STOCK_RACE_VARIANT_ID || 5204);

const success = new Counter('stock_race_success');
const conflict = new Counter('stock_race_conflict');
const unexpected = new Counter('stock_race_unexpected');

export const options = {
  scenarios: {
    stock_race: {
      executor: 'per-vu-iterations',
      vus: VUS,
      iterations: 1,
      maxDuration: '2m',
      exec: 'race',
    },
  },
  thresholds: {
    checks: ['rate>0.99'],
    stock_race_success: ['count==1'],
    stock_race_conflict: ['count>=1'],
    stock_race_unexpected: ['count==0'],
  },
};

export function setup() {
  const token = login();
  if (!token) {
    fail('No se pudo autenticar con el usuario de carga');
  }
  return { token };
}

export function race(data) {
  const response = http.post(
    `${BASE_URL}/api/orders`,
    JSON.stringify({ items: [{ variantId: VARIANT_ID, quantity: 1 }] }),
    { headers: authHeaders(data.token), tags: { name: 'POST /api/orders stock-race' } },
  );

  check(response, {
    'stock-race responde 201 o 409': (res) => res.status === 201 || res.status === 409,
  });

  if (response.status === 201) {
    success.add(1);
  } else if (response.status === 409) {
    conflict.add(1);
  } else {
    unexpected.add(1);
  }
}

export default race;
