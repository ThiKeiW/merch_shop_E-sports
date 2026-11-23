import { fail } from 'k6';

import { login } from './lib/auth.js';
import { checkoutFlow } from './lib/flows.js';

const MAX_VUS = Number(__ENV.MAX_VUS || 100);

export const options = {
  scenarios: {
    checkout: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Math.round(MAX_VUS * 0.25) },
        { duration: '3m', target: Math.round(MAX_VUS * 0.5) },
        { duration: '3m', target: MAX_VUS },
        { duration: '5m', target: MAX_VUS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'checkoutScenario',
    },
  },
  thresholds: {
    checks: ['rate>0.95'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<2500'],
  },
};

export function setup() {
  const token = login();
  if (!token) {
    fail('No se pudo autenticar con el usuario de carga');
  }
  return { token };
}

export function checkoutScenario(data) {
  checkoutFlow(data.token);
}

export default checkoutScenario;
