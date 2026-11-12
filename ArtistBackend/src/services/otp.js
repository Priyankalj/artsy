const crypto = require("crypto");
const env = require("../../env");
const {
  DEV_OTP,
  isDevLike,
  shouldMockThirdParties,
} = require("../utils/environment");

const OTP_TTL_MINUTES = env.OTP_EXPIRY || 5;
const OTP_MAX_VERIFY_ATTEMPTS = env.OTP_MAX_VERIFY_ATTEMPTS || 5;

const cooldownSeconds = () => {
  if (isDevLike()) {
    return env.OTP_COOLDOWN_SECONDS_DEV ?? 5;
  }
  return env.OTP_COOLDOWN_SECONDS || 60;
};

const OTP_COOLDOWN_MS = () => cooldownSeconds() * 1000;

/** DEV/UAT/LOCAL → always `1234`; PROD → random 4-digit. */
const generateOtp = () => {
  if (shouldMockThirdParties()) {
    return DEV_OTP;
  }
  return String(crypto.randomInt(1000, 10000));
};

const shouldRevealOtp = () => isDevLike();

const getOtpCooldownRemainingSeconds = (otpRequestedAt) => {
  if (!otpRequestedAt) return 0;
  const requestedAt = new Date(otpRequestedAt).getTime();
  if (Number.isNaN(requestedAt)) return 0;
  const remainingMs = OTP_COOLDOWN_MS() - (Date.now() - requestedAt);
  if (remainingMs <= 0) return 0;
  return Math.ceil(remainingMs / 1000);
};

const isOtpCooldownActive = (otpRequestedAt) =>
  getOtpCooldownRemainingSeconds(otpRequestedAt) > 0;

const isOtpExpired = (otpExpiry) => {
  if (!otpExpiry) return true;
  return new Date(otpExpiry).getTime() <= Date.now();
};

module.exports = {
  generateOtp,
  shouldRevealOtp,
  isOtpCooldownActive,
  getOtpCooldownRemainingSeconds,
  isOtpExpired,
  getOtpCooldownSeconds: cooldownSeconds,
  OTP_TTL_MINUTES,
  OTP_MAX_VERIFY_ATTEMPTS,
  DEV_OTP,
};
