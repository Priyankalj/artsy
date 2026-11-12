const asyncWrapper = require("../middlewares/async");
const { getPortfolioLimits } = require("../config/portfolio");
const {
  getEnvironment,
  isDevLike,
  isProd,
  shouldMockThirdParties,
  shouldCallExternalServices,
  DEV_OTP,
} = require("../utils/environment");
const { getClientPaymentConfig } = require("../services/payments");
const { getOtpCooldownSeconds } = require("../services/otp");

const fetchAppConfig = asyncWrapper(async (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      environment: getEnvironment(),
      is_dev_like: isDevLike(),
      is_prod: isProd(),
      reveal_otp: isDevLike(),
      mock_third_parties: shouldMockThirdParties(),
      external_services_live: shouldCallExternalServices(),
      otp_cooldown_seconds: getOtpCooldownSeconds(),
      // Never expose the real OTP value outside DEV-like — only the constant hint.
      dev_otp_hint: isDevLike() ? DEV_OTP : null,
      portfolio: getPortfolioLimits(),
      payments: getClientPaymentConfig(),
    },
  });
});

module.exports = {
  fetchAppConfig,
};
