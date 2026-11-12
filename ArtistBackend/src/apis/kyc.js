const express = require("express");
const { authenticate } = require("../middlewares/authentication");
const requestLogger = require("../middlewares/request-logger");
const {
  fetchKycStatus,
  initDigilockerRequest,
  digilockerCallback,
  verifySelfieFaceMatch,
} = require("../controllers/kyc");

const router = express.Router();

router.get("/status", authenticate, fetchKycStatus);
router.post("/digilocker/init", authenticate, requestLogger, initDigilockerRequest);
router.get("/digilocker/callback", digilockerCallback);
router.post("/selfie", authenticate, requestLogger, verifySelfieFaceMatch);

module.exports = router;
