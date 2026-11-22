import http from 'k6/http';
import { check } from 'k6';

import { BASE_URL } from './config.js';

function queryString(params = {}) {
  const entries = Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '');
  return entries.length
    ? `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')}`
    : '';
}

export function listProducts(params = {}) {
  const response = http.get(
    `${BASE_URL}/api/catalog/products${queryString(params)}`,
    { tags: { name: 'GET /api/catalog/products' } },
  );

  check(response, {
    'catalogo responde 200': (res) => res.status === 200,
    'catalogo devuelve items': (res) => Array.isArray(res.json('items')),
  });

  return response;
}

export function productDetail(slug) {
  const response = http.get(
    `${BASE_URL}/api/catalog/products/${encodeURIComponent(slug)}`,
    { tags: { name: 'GET /api/catalog/products/:slug' } },
  );

  check(response, {
    'detalle responde 200': (res) => res.status === 200,
    'detalle devuelve variantes': (res) => Array.isArray(res.json('variants')),
  });

  return response;
}

export function facets(game) {
  const response = http.get(
    `${BASE_URL}/api/catalog/facets${game ? `?game=${encodeURIComponent(game)}` : ''}`,
    { tags: { name: 'GET /api/catalog/facets' } },
  );

  check(response, {
    'facets responde 200': (res) => res.status === 200,
  });

  return response;
}

export function firstSlug(response) {
  const items = response.json('items');
  return items && items.length > 0 ? items[0].slug : null;
}

export function firstAvailableVariant(response) {
  const variants = response.json('variants');
  if (!Array.isArray(variants)) {
    return null;
  }
  const variant = variants.find((item) => item.available && item.stock > 0);
  return variant ? variant.id : null;
}
