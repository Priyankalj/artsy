/**
 * Single switch for the mobile app — same idea as Floatr/config.js.
 * Flip to 'PROD' when the app should talk to the live API + real payment keys.
 */
// const environment = 'PROD';
const environment = 'DEV';

import dev from './config_dev';
import prod from './config_prod';

function envSwitcher() {
  switch (environment) {
    case 'PROD':
      return prod;
    case 'DEV':
    default:
      return dev;
  }
}

const config = envSwitcher();

export const ENV = environment;
export const isDev = environment === 'DEV';
export const SERVERURL = config.SERVERURL;
export const MANUAL_LAN_IP = config.MANUAL_LAN_IP;
export const API_PORT = config.API_PORT;
export const RESEND_OTP_SECONDS = config.RESEND_OTP_SECONDS;
export const SHOW_OTP_ON_SCREEN = config.SHOW_OTP_ON_SCREEN;
export const MOCK_PAYMENTS = config.MOCK_PAYMENTS;
export const RAZORPAY_KEY_ID = config.RAZORPAY_KEY_ID;
export const RAZORPAY_CURRENCY = config.RAZORPAY_CURRENCY;
export const RAZORPAY_COMPANY_NAME = config.RAZORPAY_COMPANY_NAME;
