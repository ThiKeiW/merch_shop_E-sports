import { fail } from 'k6';

import { login } from './lib/auth.js';
import { browseFlow, shopperFlow } from './lib/flows.js';

const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || '30m';

export const options = {
  scenarios: {
    soak: {
      executor: 'constant-vus',
      vus: VUS,
      duration: DURATION,
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

export default function (data) {
  if (__VU % 5 === 0) {
    shopperFlow(data.token);
  } else {
    browseFlow();
  }
}
