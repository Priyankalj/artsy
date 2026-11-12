/**
 * PROD mobile config — point SERVERURL at the live API when you deploy.
 * Fill Razorpay live key id after KYC; secret stays on the backend only.
 */
export default {
  SERVERURL: 'https://api.example.com/api',
  MANUAL_LAN_IP: '',
  API_PORT: 443,
  RESEND_OTP_SECONDS: 60,
  SHOW_OTP_ON_SCREEN: false,
  MOCK_PAYMENTS: false,
  RAZORPAY_KEY_ID: '',
  RAZORPAY_CURRENCY: 'INR',
  RAZORPAY_COMPANY_NAME: 'Artsy',
};
