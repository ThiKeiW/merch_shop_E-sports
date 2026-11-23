import { browseFlow } from './lib/flows.js';

const MAX_VUS = Number(__ENV.MAX_VUS || 500);

export const options = {
  scenarios: {
    browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: Math.round(MAX_VUS * 0.2) },
        { duration: '3m', target: Math.round(MAX_VUS * 0.6) },
        { duration: '3m', target: MAX_VUS },
        { duration: '5m', target: MAX_VUS },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'browseScenario',
    },
  },
  thresholds: {
    checks: ['rate>0.98'],
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<1500', 'p(99)<2500'],
  },
};

export function browseScenario() {
  browseFlow();
}

export default browseScenario;
