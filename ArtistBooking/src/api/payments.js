import { apiRequest } from './client';

export async function fetchPaymentConfigApi() {
  return apiRequest('/payments/config');
}

export async function createPaymentOrderApi({
  amount,
  artist_id,
  booking_id,
  currency,
  notes,
}) {
  return apiRequest('/payments/order', {
    method: 'POST',
    body: { amount, artist_id, booking_id, currency, notes },
  });
}

export async function confirmPaymentApi({
  order_id,
  payment_id,
  signature,
}) {
  return apiRequest('/payments/confirm', {
    method: 'POST',
    body: { order_id, payment_id, signature },
  });
}
