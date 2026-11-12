module.exports = {
  // Flip to 'PROD' when MSG91 / Razorpay / DigiLocker / live FCM should run for real.
  // DEV | UAT | LOCAL → hardcoded OTP 1234, vendor SMS/email skipped, mock payments.
  ENVIRONMENT: 'DEV',
  PORT: 5050,

  DB_USER: 'postgres',
  DB_PASSWORD: 'postgres',
  DB_HOST: '127.0.0.1',
  DB_PORT: 5432,
  DB_DATABASE: 'serverArt',

  USE_MEMORY_STORE: true,

  JWT_SECRET: 'change-me-to-a-long-secret',
  JWT_LIFETIME: '7d',
  UPLOAD_SECRET_KEY: 'change-me-upload-secret',
  PUBLIC_BASE_URL: '',

  LANG: 'english',
  OTP_EXPIRY: 5,
  OTP_COOLDOWN_SECONDS: 60,
  // Faster resend while developing (Floatr-style short DEV timer).
  OTP_COOLDOWN_SECONDS_DEV: 5,
  OTP_MAX_VERIFY_ATTEMPTS: 5,
  OTP_RATE_WINDOW_MINUTES: 15,
  OTP_REQUEST_MAX: 5,
  OTP_VERIFY_MAX: 10,

  ALLOWED_ORIGINS: '*',

  // Production defaults: 5–8 photos, 2 videos. Use 1 for local testing.
  MIN_PORTFOLIO_PHOTOS: 5,
  MAX_PORTFOLIO_PHOTOS: 8,
  MIN_PORTFOLIO_VIDEOS: 2,
  MAX_PORTFOLIO_VIDEOS: 2,

  // Firebase Admin (server only). File is gitignored.
  FIREBASE_SERVICE_ACCOUNT: 'firebaseadmin/serviceAccountKey.json',

  // MSG91 (OTP SMS + booking SMS/email). Only called when ENVIRONMENT === 'PROD'
  // (or FORCE_EXTERNAL_SERVICES: true). Leave blank in DEV.
  MSG91_AUTH_KEY: '',
  MSG91_OTP_TEMPLATE_ID: '',
  MSG91_BOOKING_TEMPLATE_ID: '',
  MSG91_SENDER_ID: '',
  MSG91_EMAIL_TEMPLATE_ID: '',

  // Razorpay — leave blank for DEV mock (no account needed).
  // Optional later: paste rzp_test_* keys for real Test Checkout while ENVIRONMENT=DEV.
  // Never put rzp_live_* here until ENVIRONMENT=PROD.
  RAZORPAY_KEY_ID: '',
  RAZORPAY_KEY_SECRET: '',
  RAZORPAY_WEBHOOK_SECRET: '',
  RAZORPAY_CURRENCY: 'INR',
  RAZORPAY_COMPANY_NAME: 'Artsy',
  RAZORPAY_FORCE_MOCK: false,

  // Gridlines DigiLocker + face match. DEV mocks unless KYC_MOCK_RESPONSE is false.
  KYC_API_URL: 'https://api.gridlines.io',
  KYC_API_KEY: '',
  KYC_MOCK_RESPONSE: true,
  KYC_FACE_MATCH_THRESHOLD: 0.5,
  DIGILOCKER_PURPOSE: 'Artist identity verification',
  DIGILOCKER_SERVICE_NAME: 'Artsy',
  DIGILOCKER_REDIRECT_URI: '',
  DIGILOCKER_APP_REDIRECT: 'artsy://kyc/digilocker',

  // Optional escapes for sandbox vendor tests while ENVIRONMENT stays DEV/UAT.
  FORCE_EXTERNAL_SERVICES: false,
  FORCE_LIVE_INTEGRATIONS: false,

  ERROR_ALERT: false,
  ERROR_LOG_EMAIL: '',
  FROM_EMAIL: '',
  MSG_MAIL_DOMAIN: '',
  ERROR_LOG_TEMPLATE_ID: '',
};
