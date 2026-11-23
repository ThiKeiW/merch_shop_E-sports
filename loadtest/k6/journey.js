import { fail } from 'k6';

import { login } from './lib/auth.js';
import { browseFlow, checkoutFlow, shopperFlow } from './lib/flows.js';

const DURATION = __ENV.DURATION || '10m';
const BROWSE_VUS = Number(__ENV.BROWSE_VUS || 70);
const SHOPPER_VUS = Number(__ENV.SHOPPER_VUS || 20);
const CHECKOUT_VUS = Number(__ENV.CHECKOUT_VUS || 10);

export const options = {
  scenarios: {
    browse: {
      executor: 'constant-vus',
      vus: BROWSE_VUS,
      duration: DURATION,
      exec: 'browseScenario',
    },
    shopper: {
      executor: 'constant-vus',
      vus: SHOPPER_VUS,
      duration: DURATION,
      exec: 'shopperScenario',
    },
    checkout: {
      executor: 'constant-vus',
      vus: CHECKOUT_VUS,
      duration: DURATION,
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

export function browseScenario() {
  browseFlow();
}

export function shopperScenario(data) {
  shopperFlow(data.token);
}

export function checkoutScenario(data) {
  checkoutFlow(data.token);
}

export default function () {
  browseFlow();
}
