export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

export const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

export const DEFAULT_EMAIL = __ENV.LOADTEST_EMAIL || 'cliente@merchshop.dev';
export const DEFAULT_PASSWORD = __ENV.LOADTEST_PASSWORD || 'Cliente1234!';

export function authHeaders(token) {
  return {
    ...JSON_HEADERS,
    Authorization: `Bearer ${token}`,
  };
}

export function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function thinkTime(minSeconds, maxSeconds) {
  return randomBetween(minSeconds, maxSeconds);
}
