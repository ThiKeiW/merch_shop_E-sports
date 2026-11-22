import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL, DEFAULT_EMAIL, DEFAULT_PASSWORD, JSON_HEADERS } from './config.js';

export function login(email = DEFAULT_EMAIL, password = DEFAULT_PASSWORD) {
  const response = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS, tags: { name: 'POST /api/auth/login' } },
  );

  check(response, {
    'login responde 200': (res) => res.status === 200,
    'login devuelve token': (res) => Boolean(res.json('token')),
  });

  return response.status === 200 ? response.json('token') : null;
}
