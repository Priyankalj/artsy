/**
 * DEV mobile config (Floatr-style).
 * SERVERURL empty → auto-detect LAN host from Metro (see src/config/api.js).
 * Uncomment / set SERVERURL to pin a machine, e.g. http://10.17.90.240:5050/api
 */
export default {
  SERVERURL: '',
  MANUAL_LAN_IP: '10.83.247.240',
  API_PORT: 5050,
  RESEND_OTP_SECONDS: 5,
  SHOW_OTP_ON_SCREEN: true,
  MOCK_PAYMENTS: true,
  // Razorpay test key id only (never put the secret in the app).
  RAZORPAY_KEY_ID: 'rzp_test_dev_mock',
  RAZORPAY_CURRENCY: 'INR',
  RAZORPAY_COMPANY_NAME: 'Artsy',
};
