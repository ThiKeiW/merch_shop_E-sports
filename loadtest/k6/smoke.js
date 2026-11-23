import { fail } from 'k6';

import { login } from './lib/auth.js';
import { browseFlow, checkoutFlow, shopperFlow } from './lib/flows.js';

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<1500'],
  },
};

export function setup() {
  const token = login();
  if (!token) {
    fail('No se pudo autenticar con el usuario de carga');
  }
  return { token };
}

export default function (data) {
  browseFlow();
  shopperFlow(data.token);
  checkoutFlow(data.token);
}
