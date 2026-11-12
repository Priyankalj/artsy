const env = require("../../env");

/** Fixed OTP used whenever ENVIRONMENT is DEV / UAT / LOCAL (Floatr pattern). */
const DEV_OTP = "1234";

const getEnvironment = () => String(env.ENVIRONMENT || "DEV").toUpperCase();

/** Local / staging — reveal OTP, use mocks, skip live vendors. */
const isDevLike = () => {
  const environment = getEnvironment();
  return (
    environment === "DEV" ||
    environment === "UAT" ||
    environment === "LOCAL"
  );
};

/** Live customer traffic only. */
const isProd = () => getEnvironment() === "PROD";

/**
 * SMS, email, and other paid vendors fire only in PROD (Floatr Smsfunction pattern).
 * Override with FORCE_EXTERNAL_SERVICES=true in env.js for sandbox vendor tests.
 */
const shouldCallExternalServices = () => {
  if (env.FORCE_EXTERNAL_SERVICES === true) {
    return true;
  }
  return isProd();
};

/** DigiLocker / face-match / Razorpay live SDKs stay off outside PROD unless forced. */
const shouldMockThirdParties = () => {
  if (env.FORCE_LIVE_INTEGRATIONS === true) {
    return false;
  }
  return !isProd();
};

module.exports = {
  DEV_OTP,
  getEnvironment,
  isDevLike,
  isProd,
  shouldCallExternalServices,
  shouldMockThirdParties,
};
