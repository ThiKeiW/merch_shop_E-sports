import { sleep } from 'k6';

import {
  facets,
  firstAvailableVariant,
  firstSlug,
  listProducts,
  productDetail,
} from './catalog.js';
import { createIntent, createOrder, sendSucceededWebhook } from './orders.js';
import { thinkTime } from './config.js';

export function browseFlow() {
  const products = listProducts({ page: 0, size: 12, sort: 'relevance' });
  const slug = firstSlug(products);
  if (slug) {
    productDetail(slug);
  }
  facets();
  sleep(thinkTime(0.5, 1.5));
}

export function shopperFlow(token) {
  const products = listProducts({ page: 0, size: 12 });
  const slug = firstSlug(products);
  if (!slug) {
    sleep(thinkTime(0.5, 1.5));
    return;
  }

  const detail = productDetail(slug);
  const variantId = firstAvailableVariant(detail);
  if (variantId) {
    const order = createOrder(token, variantId, 1);
    if (order.status === 201) {
      const orderCode = order.json('code');
      const intent = createIntent(token, orderCode);
      if (intent.status === 200) {
        sendSucceededWebhook(orderCode, intent.json('paymentIntentId'));
      }
    }
  }

  sleep(thinkTime(0.5, 2));
}

export function checkoutFlow(token, variantId = Number(__ENV.CHECKOUT_VARIANT_ID || 5004)) {
  const order = createOrder(token, variantId, 1);
  if (order.status !== 201) {
    sleep(thinkTime(1, 2));
    return;
  }

  const orderCode = order.json('code');
  const intent = createIntent(token, orderCode);
  if (intent.status === 200) {
    sendSucceededWebhook(orderCode, intent.json('paymentIntentId'));
  }

  sleep(thinkTime(1, 3));
}
