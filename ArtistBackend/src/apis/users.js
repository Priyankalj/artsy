const express = require("express");
const validateRequest = require("../middlewares/validate-request");
const { authenticate } = require("../middlewares/authentication");
const requestLogger = require("../middlewares/request-logger");
const {
  customerOnboardSchema,
  deviceTokenSchema,
  deviceTokenDeleteSchema,
} = require("../validations/users");
const {
  onboardCustomer,
  getMyCustomerProfile,
} = require("../controllers/users");
const {
  registerDeviceToken,
  unregisterDeviceToken,
} = require("../controllers/deviceTokens");

const router = express.Router();

router.post(
  "/onboard",
  authenticate,
  requestLogger,
  validateRequest(customerOnboardSchema),
  onboardCustomer
);
router.get("/me", authenticate, getMyCustomerProfile);

router.post(
  "/me/device-token",
  authenticate,
  requestLogger,
  validateRequest(deviceTokenSchema),
  registerDeviceToken
);
router.delete(
  "/me/device-token",
  authenticate,
  requestLogger,
  validateRequest(deviceTokenDeleteSchema),
  unregisterDeviceToken
);

module.exports = router;
