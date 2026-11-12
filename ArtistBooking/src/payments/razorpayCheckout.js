import RazorpayCheckout from 'react-native-razorpay';
import {
  confirmPaymentApi,
  createPaymentOrderApi,
} from '../api/payments';
import { getSession } from '../auth/authService';
import {
  MOCK_PAYMENTS,
  RAZORPAY_COMPANY_NAME,
  RAZORPAY_CURRENCY,
  RAZORPAY_KEY_ID,
} from '../../config';

/**
 * DEV without real keys: mock order + confirm (no native Checkout UI).
 * With rzp_test_* keys on the server (and MOCK_PAYMENTS false / order.mock false):
 * opens react-native-razorpay Checkout.
 */
export async function collectBookingPayment({
  amount,
  artistId,
  artistName,
  description,
}) {
  const orderResult = await createPaymentOrderApi({
    amount,
    artist_id: artistId,
  });
  const order = orderResult?.data?.order;
  if (!order?.id) {
    throw new Error('Could not create payment order');
  }

  const useMock = MOCK_PAYMENTS || order.mock === true;
  const session = getSession();
  const phone = session?.user?.phone || '';

  if (useMock) {
    const confirm = await confirmPaymentApi({ order_id: order.id });
    return {
      mock: true,
      order_id: order.id,
      payment_id: confirm?.data?.payment_id,
      signature: confirm?.data?.signature,
      amount_inr: orderResult?.data?.amount_inr ?? amount,
    };
  }

  const key = order.key_id || RAZORPAY_KEY_ID;
  if (!key || key.includes('dev_mock')) {
    throw new Error(
      'Razorpay key missing. Set RAZORPAY_KEY_ID in env.js / config_dev.js, or keep MOCK_PAYMENTS true.',
    );
  }

  const checkout = await RazorpayCheckout.open({
    key,
    amount: order.amount,
    currency: order.currency || RAZORPAY_CURRENCY || 'INR',
    order_id: order.id,
    name: RAZORPAY_COMPANY_NAME || 'Artsy',
    description: description || `Booking ${artistName || ''}`.trim(),
    prefill: {
      contact: phone ? `+91${phone}` : undefined,
      name: session?.user?.name || undefined,
    },
    theme: { color: '#6C63FF' },
  });

  const confirm = await confirmPaymentApi({
    order_id: checkout.razorpay_order_id || order.id,
    payment_id: checkout.razorpay_payment_id,
    signature: checkout.razorpay_signature,
  });

  if (!confirm?.data?.verified) {
    throw new Error('Payment could not be verified');
  }

  return {
    mock: false,
    order_id: confirm.data.order_id,
    payment_id: confirm.data.payment_id,
    signature: confirm.data.signature,
    amount_inr: orderResult?.data?.amount_inr ?? amount,
  };
}
